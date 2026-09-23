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
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [returnsSubTab, setReturnsSubTab] = useState<'ALL' | 'REPLACEMENT' | 'REFUND'>('ALL');
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

  const fetchReturnRequests = useCallback(async () => {
    try {
      setLoadingReturns(true);
      const res = await orderApi.getBuyerReturnRequests();
      if (res.success && Array.isArray(res.data)) {
        setReturnRequests(res.data);
      } else {
        setReturnRequests([]);
      }
    } catch {
      setReturnRequests([]);
    } finally {
      setLoadingReturns(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchReturnRequests();
  }, [fetchOrders, fetchReturnRequests]);

  // Vietnamese Status Translator & Badge Styling (Đồng bộ 100% với trang chi tiết /orders/[id])
  const getStatusBadge = (orderOrStatus: any) => {
    let statusStr = '';
    let isPureEbook = false;
    let isPaid = false;

    if (typeof orderOrStatus === 'string') {
      statusStr = orderOrStatus;
    } else if (orderOrStatus && typeof orderOrStatus === 'object') {
      const primarySo = orderOrStatus.sellerOrders?.[0];
      statusStr = primarySo?.status || orderOrStatus.status || 'PENDING_CONFIRMATION';

      const allItems = orderOrStatus.sellerOrders?.flatMap((so: any) => so.items || []) || [];
      const hasPhysical = allItems.some((it: any) => it.format !== 'DIGITAL' && it.format !== 'EBOOK');
      const hasEbook = allItems.some((it: any) => it.format === 'DIGITAL' || it.format === 'EBOOK');
      isPureEbook = hasEbook && !hasPhysical;

      isPaid =
        orderOrStatus.paymentStatus === 'PAID' ||
        orderOrStatus.paymentMethod === 'ONLINE_PAYMENT' ||
        orderOrStatus.paymentMethod === 'PAYOS' ||
        orderOrStatus.paymentMethod === 'WALLET' ||
        Boolean(orderOrStatus.paidAt);
    }

    const s = (statusStr || '').toUpperCase();

    if (s === 'CANCELLED') {
      return {
        text: 'Đã hủy',
        icon: 'cancel',
        className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
      };
    }
    if (isPureEbook && isPaid && s !== 'PENDING_PAYMENT') {
      return {
        text: 'Đã nhận sách',
        icon: 'check_circle',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      };
    }
    if (s === 'COMPLETED' || s === 'DELIVERED') {
      return {
        text: isPureEbook ? 'Đã nhận sách' : 'Đã hoàn tất',
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

  // Return Request Status Badge
  const getReturnStatusBadge = (ret: any) => {
    const s = ret.status;
    const isReplacement = ret.type === 'REPLACEMENT';

    if (s === 'WAITING_FORWARD' || s === 'PENDING_REVIEW') {
      return {
        text: 'Đã gửi yêu cầu (Chờ duyệt)',
        icon: 'hourglass_top',
        className: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
      };
    }
    if (s === 'FORWARDED_TO_SELLER') {
      return {
        text: 'Đang xử lý (Chờ Shop phản hồi)',
        icon: 'sync',
        className: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
      };
    }
    if (s === 'SELLER_ACCEPTED' || s === 'ARBITRATED_BUYER_WINS') {
      return {
        text: isReplacement ? 'Chấp nhận đổi hàng' : 'Chấp nhận hoàn tiền',
        icon: 'check_circle',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
      };
    }
    if (s === 'SELLER_DISPUTED') {
      return {
        text: 'Shop phản biện (Đang tranh chấp)',
        icon: 'gavel',
        className: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300',
      };
    }
    if (s === 'ARBITRATED_SELLER_WINS') {
      return {
        text: isReplacement ? 'Từ chối đổi hàng' : 'Từ chối hoàn tiền',
        icon: 'cancel',
        className: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300',
      };
    }
    if (s === 'REFUNDED') {
      return {
        text: 'Đã hoàn tiền',
        icon: 'payments',
        className: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300',
      };
    }
    if (s === 'REPLACED' || s === 'COMPLETED') {
      return {
        text: 'Đã giao hàng đổi',
        icon: 'verified',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
      };
    }

    return {
      text: s || 'Đang xử lý',
      icon: 'info',
      className: 'bg-gray-50 text-gray-700 border-gray-200',
    };
  };

  // Filter Return Requests
  const filteredReturnRequests = useMemo(() => {
    return returnRequests.filter((ret: any) => {
      // 1. Sub-tab filter
      if (returnsSubTab === 'REPLACEMENT' && ret.type !== 'REPLACEMENT') return false;
      if (returnsSubTab === 'REFUND' && ret.type !== 'REFUND') return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchOrder = ret.orderId?.toLowerCase().includes(q) || ret.order?.code?.toLowerCase().includes(q);
        const matchTitle = (ret.orderItem?.title || ret.bookTitle)?.toLowerCase().includes(q);
        const matchReason = ret.reasonDetail?.toLowerCase().includes(q);
        if (!matchOrder && !matchTitle && !matchReason) return false;
      }

      return true;
    });
  }, [returnRequests, returnsSubTab, searchQuery]);

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
      if (activeTab === 'RETURNS') return true;
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
              {
                id: 'RETURNS',
                label: 'Đổi trả & Hoàn tiền',
                icon: 'sync_alt',
                badgeCount: returnRequests.length,
              },
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
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === tab.id
                        ? 'bg-white text-theme-primary'
                        : 'bg-theme-primary/15 text-theme-primary'
                    }`}
                  >
                    {tab.badgeCount}
                  </span>
                )}
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
              placeholder={activeTab === 'RETURNS' ? 'Tìm mã đơn, tên sách hoặc lý do...' : 'Tìm mã đơn hoặc tên sách...'}
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

        {/* SUB-TABS BAR FOR RETURNS & REFUNDS */}
        {activeTab === 'RETURNS' && (
          <div className="mb-6 flex flex-wrap items-center gap-2 p-2 bg-theme-surface rounded-2xl border border-theme-border shadow-2xs">
            {[
              {
                id: 'ALL',
                label: 'Tất Cả Yêu Cầu',
                icon: 'all_inclusive',
                count: returnRequests.length,
              },
              {
                id: 'REPLACEMENT',
                label: 'Đơn Đổi Trả Hàng',
                icon: 'swap_horiz',
                count: returnRequests.filter((r: any) => r.type === 'REPLACEMENT').length,
              },
              {
                id: 'REFUND',
                label: 'Đơn Hoàn Tiền',
                icon: 'account_balance_wallet',
                count: returnRequests.filter((r: any) => r.type === 'REFUND').length,
              },
            ].map((subTab) => (
              <button
                key={subTab.id}
                onClick={() => setReturnsSubTab(subTab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  returnsSubTab === subTab.id
                    ? 'bg-theme-primary/10 text-theme-primary border border-theme-primary/30 shadow-xs'
                    : 'bg-theme-surface hover:bg-theme-surface-subtle text-on-surface-variant border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-base">{subTab.icon}</span>
                <span>{subTab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    returnsSubTab === subTab.id
                      ? 'bg-theme-primary text-white'
                      : 'bg-theme-surface-subtle text-on-surface-variant'
                  }`}
                >
                  {subTab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* RETURNS & REFUNDS TAB CONTENT                             */}
        {/* ========================================================= */}
        {activeTab === 'RETURNS' ? (
          loadingReturns ? (
            /* Loading Skeleton */
            <div className="space-y-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="bg-theme-surface rounded-2xl border border-theme-border p-6 shadow-2xs">
                  <div className="flex justify-between items-center pb-4 border-b border-theme-border mb-4">
                    <div className="h-4 bg-theme-surface-subtle rounded w-48"></div>
                    <div className="h-6 bg-theme-surface-subtle rounded-full w-32"></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-16 h-20 bg-theme-surface-subtle rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-theme-surface-subtle rounded w-3/4"></div>
                      <div className="h-3 bg-theme-surface-subtle rounded w-1/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredReturnRequests.length === 0 ? (
            /* Empty State for Returns */
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-12 sm:p-16 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">sync_alt</span>
              </div>
              <h3 className="font-editorial text-xl font-bold text-on-surface mb-2">
                {searchQuery || returnsSubTab !== 'ALL'
                  ? 'Không Tìm Thấy Đơn Đổi Trả / Hoàn Tiền Nào Phù Hợp'
                  : 'Bạn Chưa Có Yêu Cầu Đổi Trả Hoặc Hoàn Tiền Nào'}
              </h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-6">
                {searchQuery || returnsSubTab !== 'ALL'
                  ? 'Hãy thử thay đổi loại đơn lọc hoặc từ khóa tìm kiếm.'
                  : 'Tất cả các sản phẩm mua trên HUKI Ebook đều được bảo lãnh đổi trả / hoàn tiền 100% khi phát sinh vấn đề.'}
              </p>
              <button
                onClick={() => setActiveTab('ALL')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-theme-primary text-white font-bold text-xs hover:bg-theme-primary-hover transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">receipt_long</span>
                <span>Xem Lịch Sử Mua Hàng</span>
              </button>
            </div>
          ) : (
            /* Return Requests Cards List */
            <div className="space-y-4">
              {filteredReturnRequests.map((ret: any) => {
                const badge = getReturnStatusBadge(ret);
                const isReplacement = ret.type === 'REPLACEMENT';

                // Format reason text
                const reasonText =
                  ret.reason === 'NOT_AS_DESCRIBED'
                    ? 'Hàng không đúng mô tả'
                    : ret.reason === 'DAMAGED_TORN' || ret.reason === 'DAMAGED'
                    ? 'Hàng bị hỏng, rách'
                    : 'Lý do khác';

                return (
                  <div
                    key={ret.id}
                    className="bg-theme-surface rounded-2xl border border-theme-border shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-5 bg-theme-surface-subtle/50 border-b border-theme-border flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Type Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            isReplacement
                              ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {isReplacement ? 'swap_horiz' : 'account_balance_wallet'}
                          </span>
                          <span>{isReplacement ? 'ĐƠN ĐỔI TRẢ' : 'ĐƠN HOÀN TIỀN'}</span>
                        </span>

                        {/* Order Code */}
                        <span className="font-mono text-xs font-bold text-on-surface bg-theme-surface px-2.5 py-1 rounded-lg border border-theme-border">
                          Đơn: #{ret.order?.code || ret.orderId?.slice(0, 8)}
                        </span>

                        {/* Store Tag */}
                        {ret.store?.name && (
                          <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">storefront</span>
                            <span>{ret.store.name}</span>
                          </span>
                        )}

                        {/* Date Created */}
                        <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">calendar_today</span>
                          {new Date(ret.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Processing Status Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.className}`}
                        >
                          <span className="material-symbols-outlined text-xs">{badge.icon}</span>
                          <span>{badge.text}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Body: Product Item & Return Details */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Product Row */}
                      <div className="flex items-center gap-4">
                        {/* Book Cover */}
                        <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg bg-theme-surface-subtle border border-theme-border overflow-hidden shrink-0 flex items-center justify-center">
                          {ret.orderItem?.coverUrl ? (
                            <img
                              src={ret.orderItem.coverUrl}
                              alt={ret.orderItem.title}
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
                            {ret.orderItem?.title || ret.bookTitle}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-on-surface-variant">
                              Số lượng:{' '}
                              <b className="text-on-surface">{ret.orderItem?.quantity || ret.quantity || 1}</b>
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              • Đơn giá:{' '}
                              <b className="text-on-surface">
                                {Number(ret.orderItem?.price || ret.amount || 0).toLocaleString('vi-VN')}đ
                              </b>
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-on-surface-variant font-medium">
                            {isReplacement ? 'Giá trị đổi' : 'Số tiền hoàn'}
                          </div>
                          <div className="font-bold text-xs sm:text-sm text-theme-primary">
                            {Number(ret.amount || 0).toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>

                      {/* Reason & Evidence Box */}
                      <div className="p-3.5 rounded-xl bg-theme-surface-subtle border border-theme-border/70 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-on-surface font-semibold">
                            <span className="material-symbols-outlined text-sm text-amber-600">report_problem</span>
                            <span>Lý do: {reasonText}</span>
                          </div>
                          {ret.reasonDetail && (
                            <span className="text-on-surface-variant text-[11px] italic">
                              &ldquo;{ret.reasonDetail}&rdquo;
                            </span>
                          )}
                        </div>

                        {/* Evidence Files (Images, Videos, Documents/PDF) */}
                        {((Array.isArray(ret.evidenceImages) && ret.evidenceImages.length > 0) ||
                          (Array.isArray(ret.evidenceVideos) && ret.evidenceVideos.length > 0) ||
                          (Array.isArray(ret.evidenceDocuments) && ret.evidenceDocuments.length > 0) ||
                          (Array.isArray(ret.evidencePdfs) && ret.evidencePdfs.length > 0)) && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] text-on-surface-variant font-medium shrink-0">
                              Minh chứng:
                            </span>
                            {/* Images */}
                            {Array.isArray(ret.evidenceImages) &&
                              ret.evidenceImages.map((imgUrl: string, idx: number) => (
                                <a
                                  key={`img-${idx}`}
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-10 h-10 rounded-lg overflow-hidden border border-theme-border shrink-0 hover:opacity-80 transition-opacity"
                                  title={`Ảnh minh chứng #${idx + 1}`}
                                >
                                  <img src={imgUrl} alt={`evidence-${idx}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            {/* Videos */}
                            {Array.isArray(ret.evidenceVideos) &&
                              ret.evidenceVideos.map((vidUrl: string, idx: number) => (
                                <a
                                  key={`vid-${idx}`}
                                  href={vidUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="h-10 px-2 rounded-lg border border-theme-border bg-theme-surface-subtle flex items-center gap-1 text-[11px] font-bold text-on-surface hover:border-theme-primary transition-colors"
                                  title={`Video minh chứng #${idx + 1}`}
                                >
                                  <span className="material-symbols-outlined text-sm text-theme-primary">play_circle</span>
                                  <span>Video #{idx + 1}</span>
                                </a>
                              ))}
                            {/* Documents / PDFs */}
                            {(ret.evidenceDocuments || ret.evidencePdfs || []).map((docUrl: string, idx: number) => (
                              <a
                                key={`doc-${idx}`}
                                href={docUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={`evidence-${idx + 1}.pdf`}
                                className="h-10 px-2.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30 flex items-center gap-1.5 text-[11px] font-bold text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors"
                                title={`Tài liệu/PDF minh chứng #${idx + 1}`}
                              >
                                <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                                <span>Tài liệu/PDF #{idx + 1}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Specific Logic for REPLACEMENT vs REFUND */}
                      {isReplacement ? (
                        /* ĐỔI TRẢ HÀNG: Replacement Shipping Status */
                        <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-base">local_shipping</span>
                            </div>
                            <div>
                              <div className="font-bold text-on-surface flex items-center gap-2">
                                <span>Trạng thái vận chuyển hàng đổi:</span>
                                {ret.replacementTrackingCode ? (
                                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 font-bold text-[11px]">
                                    {ret.replacementStatus || 'Đang vận chuyển'}
                                  </span>
                                ) : ret.status === 'SELLER_ACCEPTED' || ret.status === 'ARBITRATED_BUYER_WINS' ? (
                                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold text-[11px]">
                                    Shop đang đóng gói hàng đổi mới
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-medium text-[11px]">
                                    Chờ xác nhận yêu cầu đổi
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                {ret.replacementTrackingCode
                                  ? `Đơn vị vận chuyển: ${ret.replacementCarrier || 'HUKI Express'} • Mã vận đơn: #${ret.replacementTrackingCode}`
                                  : 'Shop sẽ gửi ấn phẩm đổi mới (0đ) ngay sau khi tiếp nhận và xác nhận.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* HOÀN TIỀN: Refund Escrow Status */
                        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-base">payments</span>
                            </div>
                            <div>
                              <div className="font-bold text-on-surface flex items-center gap-2">
                                <span>Trạng thái hoàn tiền:</span>
                                {ret.status === 'REFUNDED' || ret.order?.paymentStatus === 'REFUNDED' ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold text-[11px] flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                    <span>Đã hoàn tiền 100%</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">lock</span>
                                    <span>Chưa hoàn tiền (Đang bảo lãnh Escrow)</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                {ret.status === 'REFUNDED' || ret.order?.paymentStatus === 'REFUNDED'
                                  ? `Đã hoàn trả thành công ${Number(ret.amount || 0).toLocaleString('vi-VN')}đ về phương thức thanh toán gốc.`
                                  : `Số tiền ${Number(ret.amount || 0).toLocaleString('vi-VN')}đ đang được bảo vệ an toàn tại Ký Quỹ Escrow HUKI và sẵn sàng hoàn lại ngay khi duyệt.`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Store Dispute Banner if Shop Disputed */}
                      {ret.status === 'SELLER_DISPUTED' && (
                        <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-start gap-2">
                          <span className="material-symbols-outlined text-base text-orange-600 shrink-0">gavel</span>
                          <div>
                            <span className="font-bold">Cửa hàng đã gửi phản biện: </span>
                            <span>{ret.sellerDisputeReason || 'Shop không đồng ý với yêu cầu đổi trả này.'}</span>
                            <p className="text-[11px] text-orange-700 mt-0.5 font-medium">
                              Platform Admin đang tiếp nhận trọng tài và sẽ ra phán quyết bảo vệ quyền lợi hợp lệ.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Admin Ruling Banner if Arbitrated */}
                      {ret.adminRuling && (
                        <div
                          className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                            ret.adminRuling === 'BUYER_WINS'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-red-50 border-red-200 text-red-900'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base shrink-0">
                            {ret.adminRuling === 'BUYER_WINS' ? 'verified' : 'cancel'}
                          </span>
                          <div>
                            <span className="font-bold">
                              Phán quyết Trọng tài:{' '}
                              {ret.adminRuling === 'BUYER_WINS'
                                ? 'Chấp thuận yêu cầu của người mua'
                                : 'Từ chối yêu cầu đổi trả'}
                            </span>
                            {ret.adminRulingReason && (
                              <p className="text-[11px] mt-0.5">&ldquo;{ret.adminRulingReason}&rdquo;</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Summary & Action Button */}
                    <div className="p-4 sm:p-5 bg-theme-surface-subtle/30 border-t border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-on-surface-variant">
                          {isReplacement ? 'Hình thức giải quyết:' : 'Tổng tiền hoàn dự kiến:'}
                        </span>
                        <span className="font-bold text-sm text-theme-primary">
                          {isReplacement
                            ? 'Đổi sản phẩm mới (0đ)'
                            : `${Number(ret.amount || 0).toLocaleString('vi-VN')}đ (100%)`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/orders/${ret.orderId}`}
                          className="px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          <span>Xem Chi Tiết Đơn</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ========================================================= */
          /* REGULAR ORDERS LIST CONTENT                               */
          /* ========================================================= */
          isLoading ? (
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
          )
        )}

        {/* Pagination Bar (For standard orders) */}
        {activeTab !== 'RETURNS' && paginationMeta.totalPages > 1 && (
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
