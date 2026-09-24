"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderApi } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';
import AccountLayout from '@/ui/components/layout/AccountLayout';

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
  const [dateFilter, setDateFilter] = useState('ALL');
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

  // Status Translator matching Shopee style
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
        text: 'ĐÃ HỦY',
        icon: 'cancel',
        colorClass: 'text-red-600',
        bgClass: 'bg-red-50 border-red-200 text-red-700',
      };
    }
    if (isPureEbook && isPaid && s !== 'PENDING_PAYMENT') {
      return {
        text: 'ĐÃ NHẬN SÁCH',
        icon: 'check_circle',
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      };
    }
    if (s === 'COMPLETED' || s === 'DELIVERED') {
      return {
        text: isPureEbook ? 'ĐÃ NHẬN SÁCH' : 'HOÀN THÀNH',
        icon: 'check_circle',
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      };
    }
    if (s === 'SHIPPED') {
      return {
        text: 'ĐANG VẬN CHUYỂN',
        icon: 'local_shipping',
        colorClass: 'text-purple-600',
        bgClass: 'bg-purple-50 border-purple-200 text-purple-700',
      };
    }
    if (s === 'CONFIRMED' || s === 'PREPARING' || s === 'PROCESSING') {
      return {
        text: 'ĐANG CHUẨN BỊ',
        icon: 'inventory_2',
        colorClass: 'text-blue-600',
        bgClass: 'bg-blue-50 border-blue-200 text-blue-700',
      };
    }
    if (s === 'PENDING_PAYMENT') {
      return {
        text: 'CHỜ THANH TOÁN',
        icon: 'pending',
        colorClass: 'text-amber-600',
        bgClass: 'bg-amber-50 border-amber-200 text-amber-700',
      };
    }
    return {
      text: 'CHỜ XÁC NHẬN',
      icon: 'hourglass_top',
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50 border-amber-200 text-amber-700',
    };
  };

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((ord: any) => {
      // 1. Search Query Filter
      const search = searchQuery.toLowerCase().trim();
      const matchCode = ord.code?.toLowerCase().includes(search);
      const matchItems = ord.sellerOrders?.some((so: any) =>
        so.items?.some((it: any) => (it.bookTitle || it.title)?.toLowerCase().includes(search))
      );
      const matchStore = ord.sellerOrders?.some((so: any) =>
        (so.storeName || so.shopName || so.store?.name)?.toLowerCase().includes(search)
      );

      if (search && !matchCode && !matchItems && !matchStore) {
        return false;
      }

      // 2. Status Tab Filter
      if (activeTab !== 'ALL' && activeTab !== 'RETURNS') {
        const effectiveStatus = (ord.sellerOrders?.[0]?.status || ord.status || '').toUpperCase();

        if (activeTab === 'PENDING') {
          if (
            effectiveStatus !== 'PENDING_CONFIRMATION' &&
            effectiveStatus !== 'PENDING_PAYMENT' &&
            effectiveStatus !== 'PENDING'
          ) {
            return false;
          }
        } else if (activeTab === 'PREPARING') {
          if (
            effectiveStatus !== 'CONFIRMED' &&
            effectiveStatus !== 'PREPARING' &&
            effectiveStatus !== 'PROCESSING'
          ) {
            return false;
          }
        } else if (activeTab === 'SHIPPED') {
          if (effectiveStatus !== 'SHIPPED') return false;
        } else if (activeTab === 'COMPLETED') {
          if (effectiveStatus !== 'COMPLETED' && effectiveStatus !== 'DELIVERED') return false;
        } else if (activeTab === 'CANCELLED') {
          if (effectiveStatus !== 'CANCELLED') return false;
        }
      }

      // 3. Date Filter (Option on right)
      if (dateFilter !== 'ALL') {
        const ordDate = new Date(ord.createdAt || ord.created_at || Date.now());
        const now = new Date();
        if (dateFilter === 'THIS_MONTH') {
          if (ordDate.getMonth() !== now.getMonth() || ordDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (dateFilter === 'LAST_3_MONTHS') {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          if (ordDate < threeMonthsAgo) return false;
        } else if (dateFilter === 'THIS_YEAR') {
          if (ordDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, searchQuery, dateFilter]);

  // Group filtered orders by date (Shopee date grouping)
  const groupedOrders = useMemo(() => {
    const groupsMap: Record<string, { dateLabel: string; rawDate: Date; orders: any[] }> = {};

    filteredOrders.forEach((ord: any) => {
      const d = new Date(ord.createdAt || ord.created_at || Date.now());
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const isToday = d.toDateString() === new Date().toDateString();
      const dateLabel = isToday
        ? `Hôm nay • ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        : `Ngày ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

      if (!groupsMap[dateKey]) {
        groupsMap[dateKey] = {
          dateLabel,
          rawDate: d,
          orders: [],
        };
      }
      groupsMap[dateKey].orders.push(ord);
    });

    return Object.values(groupsMap).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [filteredOrders]);

  const filteredReturnRequests = useMemo(() => {
    return returnRequests.filter((ret: any) => {
      if (returnsSubTab === 'REPLACEMENT' && ret.type !== 'REPLACEMENT') return false;
      if (returnsSubTab === 'REFUND' && ret.type !== 'REFUND') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = ret.order?.code?.toLowerCase().includes(q) || ret.orderId?.toLowerCase().includes(q);
        const matchTitle = ret.orderItem?.title?.toLowerCase().includes(q) || ret.bookTitle?.toLowerCase().includes(q);
        const matchStore = ret.store?.name?.toLowerCase().includes(q);
        return matchCode || matchTitle || matchStore;
      }
      return true;
    });
  }, [returnRequests, returnsSubTab, searchQuery]);

  return (
    <AccountLayout>
      <div className="p-4 sm:p-6 space-y-4">
        
        {/* ================= 1. SHOPEE STATUS TABS BAR ================= */}
        <div className="bg-white border-b border-gray-200 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 px-4 sm:px-6 pt-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-2 min-w-max">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'PENDING', label: 'Chờ xác nhận' },
              { id: 'PREPARING', label: 'Đang chuẩn bị' },
              { id: 'SHIPPED', label: 'Đang vận chuyển' },
              { id: 'COMPLETED', label: 'Đã hoàn tất' },
              { id: 'CANCELLED', label: 'Đã hủy' },
              {
                id: 'RETURNS',
                label: 'Trả hàng / Hoàn tiền',
                badgeCount: returnRequests.length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 sm:px-4 py-3 text-xs sm:text-[13px] font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-[#003B2B] text-[#003B2B] font-bold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-[#003B2B] text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {tab.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= 2. SEARCH (LEFT WIDE) + SELECT FILTER (RIGHT) ================= */}
        <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-200/80 flex flex-col sm:flex-row items-center gap-2.5">
          {/* Large Search Bar on Left */}
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bạn có thể tìm kiếm theo tên Shop, ID đơn hàng hoặc Tên Sách..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#003B2B] focus:ring-1 focus:ring-[#003B2B] transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs cursor-pointer p-0.5"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Select Option on Right */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#003B2B] cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tất cả thời gian</option>
              <option value="THIS_MONTH">Tháng này ({new Date().getMonth() + 1}/{new Date().getFullYear()})</option>
              <option value="LAST_3_MONTHS">3 tháng gần nhất</option>
              <option value="THIS_YEAR">Năm {new Date().getFullYear()}</option>
            </select>
          </div>
        </div>

        {/* ================= 3. RETURNS / REFUNDS SUB-TABS (IF SELECTED) ================= */}
        {activeTab === 'RETURNS' && (
          <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
            {[
              { id: 'ALL', label: 'Tất Cả Yêu Cầu', count: returnRequests.length },
              { id: 'REPLACEMENT', label: 'Đổi Trả Hàng', count: returnRequests.filter((r: any) => r.type === 'REPLACEMENT').length },
              { id: 'REFUND', label: 'Hoàn Tiền', count: returnRequests.filter((r: any) => r.type === 'REFUND').length },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setReturnsSubTab(sub.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  returnsSubTab === sub.id
                    ? 'bg-[#003B2B] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                <span>{sub.label}</span>
                <span className="text-[10px] opacity-80">({sub.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* ================= 4. ORDERS STREAM (GROUPED BY DATE - SHOPEE STYLE) ================= */}
        {isLoading ? (
          <div className="space-y-4 py-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <div className="h-4 bg-gray-100 rounded w-48"></div>
                  <div className="h-4 bg-gray-100 rounded w-24"></div>
                </div>
                <div className="flex gap-4">
                  <div className="w-14 h-20 bg-gray-100 rounded-md shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'RETURNS' ? (
          /* Returns Requests List */
          filteredReturnRequests.length === 0 ? (
            <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">sync_alt</span>
              <p className="text-xs font-semibold text-gray-700">Chưa có yêu cầu đổi trả hoặc hoàn tiền nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReturnRequests.map((ret: any) => (
                <div key={ret.id} className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#003B2B]">{ret.store?.name || 'HUKI Partner Store'}</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-mono text-gray-600">Đơn #{ret.order?.code || ret.orderId?.slice(0, 8)}</span>
                    </div>
                    <span className="font-bold text-amber-600 uppercase text-[11px]">{ret.status}</span>
                  </div>
                  <div className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-gray-900">{ret.orderItem?.title || ret.bookTitle}</h4>
                      <p className="text-gray-500 text-[11px] mt-0.5">Số lượng: {ret.quantity || 1} • Lý do: {ret.reason}</p>
                    </div>
                    <Link
                      href={`/orders/${ret.orderId}`}
                      className="px-3 py-1.5 rounded-lg bg-[#003B2B] text-white font-bold text-xs hover:bg-[#00241A] transition-colors"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200/90 space-y-3">
            <span className="material-symbols-outlined text-4xl text-gray-300">receipt_long</span>
            <h3 className="font-bold text-sm text-gray-800">
              {searchQuery ? 'Không tìm thấy đơn hàng nào khớp với từ khóa' : 'Chưa có đơn hàng nào'}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Khám phá hàng ngàn tựa sách hay bản quyền trên HUKI Ebook và đặt mua ngay hôm nay.
            </p>
            <Link
              href="/books"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#003B2B] text-white text-xs font-bold hover:bg-[#00241A] transition-colors"
            >
              <span className="material-symbols-outlined text-base">explore</span>
              <span>Khám Phá Sách</span>
            </Link>
          </div>
        ) : (
          /* GROUPED BY DATE SECTIONS */
          <div className="space-y-6">
            {groupedOrders.map((group) => (
              <div key={group.dateLabel} className="space-y-3">
                {/* Date Group Heading (Clean & sticky-friendly) */}
                <div className="flex items-center gap-2 px-1">
                  <span className="material-symbols-outlined text-base text-[#003B2B]">calendar_month</span>
                  <h3 className="text-xs font-bold text-gray-700 tracking-tight">
                    {group.dateLabel}
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">({group.orders.length} đơn)</span>
                  <div className="flex-1 h-px bg-gray-200/80 ml-2"></div>
                </div>

                {/* Orders List inside this Date */}
                <div className="space-y-3.5">
                  {group.orders.map((ord: any) => {
                    const badge = getStatusBadge(ord);
                    const allItems = ord.sellerOrders?.flatMap((so: any) => so.items || []) || [];
                    const totalItemsCount = allItems.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
                    const storeName = ord.sellerOrders?.[0]?.storeName || ord.sellerOrders?.[0]?.store?.name || 'Alpha Books Official';
                    const storeId = ord.sellerOrders?.[0]?.storeId || ord.sellerOrders?.[0]?.store?.id || 'alpha-books';

                    const ordTime = new Date(ord.createdAt || ord.created_at || Date.now()).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <article
                        key={ord.id}
                        className="bg-white rounded-xl border border-gray-200/90 shadow-2xs hover:border-gray-300 transition-all overflow-hidden"
                      >
                        {/* ================= 1. CARD TOP BAR: SHOP NAME + CHAT + STATUS ================= */}
                        <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-3 text-xs">
                          {/* Left: Shop Branding & Quick Actions */}
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="material-symbols-outlined text-[17px] text-[#003B2B] shrink-0">
                              storefront
                            </span>
                            <span className="font-bold text-gray-900 truncate">
                              {storeName}
                            </span>

                            {/* Chat with Store Button */}
                            <Link
                              href={`/account/messages?shop=${encodeURIComponent(storeId)}`}
                              className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold border border-rose-200 flex items-center gap-1 transition-colors"
                              title="Nhắn tin với Shop"
                            >
                              <span className="material-symbols-outlined text-[13px]">chat</span>
                              <span>Chat</span>
                            </Link>

                            {/* View Shop Link */}
                            <Link
                              href={`/shop/${storeId}`}
                              className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium border border-gray-200 transition-colors hidden sm:inline-block"
                            >
                              Xem Shop
                            </Link>

                            <span className="text-gray-300 hidden sm:inline">|</span>

                            <span className="font-mono text-[11px] text-gray-500 font-semibold">
                              #{ord.code}
                            </span>
                          </div>

                          {/* Right: Status */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`font-bold text-xs uppercase tracking-wider ${badge.colorClass}`}>
                              {badge.text}
                            </span>
                          </div>
                        </div>

                        {/* ================= 2. CARD BODY: PRODUCT ITEMS ================= */}
                        <div className="divide-y divide-gray-100">
                          {allItems.map((item: any, idx: number) => {
                            const coverSrc = item.bookCoverUrl || item.coverUrl || item.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80';
                            const title = item.bookTitle || item.title || 'Tựa Sách HUKI';
                            const formatLabel = item.format === 'DIGITAL' || item.format === 'EBOOK' ? 'Sách Điện Tử (Ebook DRM)' : 'Sách In Bìa Cứng';
                            const itemPrice = Number(item.price || item.unitPrice || 0);
                            const originalItemPrice = item.originalPrice ? Number(item.originalPrice) : (itemPrice > 0 ? Math.round(itemPrice * 1.3) : 0);

                            return (
                              <Link
                                key={item.id || idx}
                                href={`/orders/${ord.id}`}
                                className="p-4 flex items-start gap-3.5 hover:bg-gray-50/50 transition-colors block cursor-pointer"
                              >
                                {/* Thumbnail */}
                                <div className="w-14 h-20 min-w-[56px] max-w-[56px] rounded-md overflow-hidden bg-gray-100 border border-gray-200 shrink-0 shadow-2xs">
                                  <img
                                    src={coverSrc}
                                    alt={title}
                                    className="w-full h-full object-cover shrink-0"
                                  />
                                </div>

                                {/* Item Info */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug">
                                    {title}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] text-gray-500">
                                      Phân loại: {formatLabel}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-700 font-medium block mt-0.5">
                                    x{item.quantity || 1}
                                  </span>
                                </div>

                                {/* Item Price */}
                                <div className="text-right shrink-0">
                                  {originalItemPrice > itemPrice && (
                                    <span className="text-[11px] text-gray-400 line-through block">
                                      {originalItemPrice.toLocaleString('vi-VN')}₫
                                    </span>
                                  )}
                                  <span className="text-xs sm:text-sm font-bold text-gray-900">
                                    {itemPrice.toLocaleString('vi-VN')}₫
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {/* ================= 3. CARD FOOTER: TOTAL & ACTION BUTTONS ================= */}
                        <div className="px-4 py-3 bg-white border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          {/* Left: Timestamp & Payment Method */}
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span className="material-symbols-outlined text-[15px] text-gray-400">schedule</span>
                            <span>{ordTime}</span>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                              {ord.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : ord.paymentMethod || 'Đã thanh toán'}
                            </span>
                          </div>

                          {/* Right: Grand Total & Action Buttons */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shrink-0">
                            <div className="flex items-center gap-1.5 sm:justify-end">
                              <span className="text-xs text-gray-600 font-medium">
                                Thành tiền ({totalItemsCount} món):
                              </span>
                              <span className="text-sm sm:text-base font-bold text-[#ac2c19]">
                                {Number(ord.grandTotal || ord.totalAmount || 0).toLocaleString('vi-VN')} ₫
                              </span>
                            </div>

                            {/* Buttons Group */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => router.push('/books')}
                                className="px-3.5 py-1.5 rounded-lg border border-[#ac2c19] text-[#ac2c19] hover:bg-[#ac2c19] hover:text-white transition-colors text-xs font-semibold cursor-pointer"
                              >
                                Mua Lại
                              </button>

                              <Link
                                href={`/account/messages?shop=${encodeURIComponent(storeId)}`}
                                className="px-3.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors text-xs font-semibold cursor-pointer"
                              >
                                Liên Hệ Người Bán
                              </Link>

                              <Link
                                href={`/orders/${ord.id}`}
                                className="px-3.5 py-1.5 rounded-lg bg-[#003B2B] hover:bg-[#00241A] text-white transition-colors text-xs font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Chi Tiết &amp; Tiến Trình</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= 5. PAGINATION ================= */}
        {activeTab !== 'RETURNS' && paginationMeta.totalPages > 1 && (
          <div className="pt-4 flex items-center justify-between text-xs text-gray-500">
            <div>
              Hiển thị <b>{filteredOrders.length}</b> đơn hàng
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all cursor-pointer"
              >
                Trước
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-[#003B2B] text-white font-bold">
                {currentPage} / {paginationMeta.totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(paginationMeta.totalPages, p + 1))}
                disabled={currentPage >= paginationMeta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
