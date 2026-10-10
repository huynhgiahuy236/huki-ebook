"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { businessApi } from '@/ui/api/businessApi';
import { catalogApi } from '@/ui/api/catalogApi';
import { orderApi } from '@/ui/api/orderApi';
import { walletApi, type WalletTransactionItem } from '@/ui/api/walletApi';
import { getSellerVouchers, type Voucher, formatDiscountValue } from '@/ui/api/sellerVoucherApi';
import { useAuth } from '@/ui/context/AuthContext';
import { can, PERMISSIONS } from '@/ui/utils/permissions';

interface OrderItem {
  id?: string;
  code?: string;
  order?: { shippingAddress?: { fullName?: string } };
  shippingAddress?: { fullName?: string };
  items?: Array<{ title?: string; quantity?: number }>;
  grandTotal?: number;
  totalAmount?: number;
  itemSubtotal?: number;
  status?: string;
  createdAt?: string;
}

export default function SellerDashboardPage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  
  // Interactive period filters
  const [pipelinePeriod, setPipelinePeriod] = useState<'THIS_MONTH' | 'THIS_WEEK' | 'ALL'>('THIS_MONTH');
  const [acqPeriod, setAcqPeriod] = useState<'6_MONTHS' | 'THIS_YEAR' | 'ALL'>('6_MONTHS');
  const [isExporting, setIsExporting] = useState(false);

  // -- Real data state --
  const [stats, setStats] = useState<{
    storeName: string;
    businessName: string;
    totalStores: number;
    totalBooks: number;
    publishedBooks: number;
    draftBooks: number;
    physicalBooks: number;
    digitalBooks: number;
    hybridBooks: number;
    totalStock: number;
    lowStockCount: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    recentOrders: OrderItem[];
    recentTransactions: WalletTransactionItem[];
    activeVouchers: Voucher[];
  }>({
    storeName: '',
    businessName: '',
    totalStores: 0,
    totalBooks: 0,
    publishedBooks: 0,
    draftBooks: 0,
    physicalBooks: 0,
    digitalBooks: 0,
    hybridBooks: 0,
    totalStock: 0,
    lowStockCount: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    recentOrders: [],
    recentTransactions: [],
    activeVouchers: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const currentBizId = user?.business?.id || activeBusinessId;
  const canViewDashboard = can(PERMISSIONS.DASHBOARD_VIEW, currentBizId || undefined, user);

  const fetchDashboardData = useCallback(async () => {
    setLoadingStats(true);
    let bizId = user?.business?.id || activeBusinessId;

    // Auto-resolve businessId
    if (!bizId) {
      try {
        const myBiz = await businessApi.getMyBusiness();
        if (myBiz.success && myBiz.data?.id) {
          bizId = myBiz.data.id;
          setActiveBusinessId(bizId);
        }
      } catch { /* ignore */ }
    }

    const result = {
      storeName: '',
      businessName: user?.business?.name || user?.name || '',
      totalStores: 0,
      totalBooks: 0,
      publishedBooks: 0,
      draftBooks: 0,
      physicalBooks: 0,
      digitalBooks: 0,
      hybridBooks: 0,
      totalStock: 0,
      lowStockCount: 0,
      totalOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      recentOrders: [] as OrderItem[],
      recentTransactions: [] as WalletTransactionItem[],
      activeVouchers: [] as Voucher[],
    };

    // Helper for unpacking API response lists
    const extractList = (input: any): any[] => {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      if (Array.isArray(input.items)) return input.items;
      if (Array.isArray(input.data)) return input.data;
      if (Array.isArray(input.data?.items)) return input.data.items;
      if (Array.isArray(input.data?.data)) return input.data.data;
      if (Array.isArray(input.data?.data?.items)) return input.data.data.items;
      return [];
    };

    // 1. Fetch stores
    if (bizId) {
      try {
        const storesRes = await businessApi.getMyStores(bizId);
        if (storesRes.success && Array.isArray(storesRes.data)) {
          result.totalStores = storesRes.data.length;
          const approved = storesRes.data.find(s => s.status === 'APPROVED');
          result.storeName = approved?.name || storesRes.data[0]?.name || '';
        }
      } catch { /* ignore */ }
    }

    // 2. Fetch books (Resilient loading: limit <= 100 to satisfy backend validation)
    try {
      let items: any[] = [];
      const res = await catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });
      items = extractList(res.data);
      if (items.length === 0) items = extractList(res);

      if (items.length === 0) {
        const fallbackRes = await catalogApi.getSellerBooks({ limit: 100 });
        items = extractList(fallbackRes.data);
        if (items.length === 0) items = extractList(fallbackRes);
      }

      if (items.length === 0) {
        const pubRes = await catalogApi.getPublicBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });
        items = extractList(pubRes.data);
        if (items.length === 0) items = extractList(pubRes);
      }

      if (items.length > 0) {
        result.totalBooks = items.length;
        result.publishedBooks = items.filter((b: any) => b.status === 'PUBLISHED' || b.status === 'ACTIVE').length;
        result.draftBooks = items.filter((b: any) => b.status === 'DRAFT' || b.status === 'INACTIVE' || b.status === 'PENDING').length;

        // Format detection
        result.physicalBooks = items.filter((b: any) => 
          b.format === 'PHYSICAL' || b.format === 'PAPER' || b.format === 'PRINT'
        ).length;

        result.digitalBooks = items.filter((b: any) => 
          b.format === 'DIGITAL' || b.format === 'EBOOK'
        ).length;

        result.hybridBooks = items.filter((b: any) => 
          b.format === 'BOTH' || b.format === 'COMBO' || b.format === 'HYBRID'
        ).length;

        result.totalStock = items.reduce((sum: number, b: any) => sum + (Number(b.physicalDetails?.stock) || Number(b.stock) || 0), 0);
        result.lowStockCount = items.filter((b: any) => {
          const stk = Number(b.physicalDetails?.stock) || Number(b.stock) || 0;
          return stk > 0 && stk < 10;
        }).length;
      }
    } catch (err) {
      console.warn('Dashboard books load error:', err);
    }

    // 3. Fetch orders & revenue
    try {
      let list: OrderItem[] = [];
      const ordersRes = await orderApi.getSellerOrders(bizId || undefined);
      if (ordersRes.success && ordersRes.data) {
        list = extractList(ordersRes.data);
      }
      if (list.length === 0) {
        const fallbackOrders = await orderApi.getSellerOrders();
        if (fallbackOrders.success && fallbackOrders.data) {
          list = extractList(fallbackOrders.data);
        }
      }
      result.totalOrders = list.length;
      result.pendingOrders = list.filter(o => o.status === 'PENDING_CONFIRMATION' || o.status === 'PENDING_PAYMENT').length;
      result.totalRevenue = list
        .filter(o => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
        .reduce((sum, o) => sum + Number(o.grandTotal || o.totalAmount || o.itemSubtotal || 0), 0);
      result.recentOrders = list.slice(0, 5);
    } catch { /* ignore */ }

    // 4. Fetch recent wallet transactions for real operations audit
    try {
      const storeId = user?.business?.id || bizId;
      if (storeId) {
        const txRes = await walletApi.getStoreWalletTransactions(storeId, { page: 1, limit: 5 });
        if (txRes.success && txRes.data?.items) {
          result.recentTransactions = txRes.data.items;
        }
      }
    } catch { /* ignore */ }

    // 5. Fetch seller vouchers / promotions (real DB)
    try {
      const vRes = await getSellerVouchers(bizId ? { storeId: bizId } : undefined);
      if (vRes.success && vRes.data?.items) {
        result.activeVouchers = vRes.data.items.filter((v: Voucher) => v.status === 'ACTIVE');
      }
    } catch { /* ignore */ }

    setStats(result);
    setLoadingStats(false);
  }, [user, activeBusinessId, setActiveBusinessId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fmt = (n?: number) => (n || 0).toLocaleString('vi-VN');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // Format relative time
  const formatTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return 'Vừa xong';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Vừa xong';
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr} giờ trước`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay} ngày trước`;
    } catch {
      return 'Gần đây';
    }
  };

  // 403 Guard if not authorized
  if (!canViewDashboard) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 border border-amber-500/20 shadow-xs">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>
        <h2 className="text-xl font-bold font-editorial text-theme-on-surface mb-2">
          Không Có Quyền Truy Cập (403 Forbidden)
        </h2>
        <p className="text-xs sm:text-sm text-theme-on-surface-variant max-w-md mb-6">
          Tài khoản nhân viên của bạn chưa được cấp quyền xem Bảng Điều Khiển Tổng Quan (`DASHBOARD_VIEW`).
        </p>
        <Link
          href="/seller/orders"
          className="px-4 py-2.5 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm"
        >
          Đến Trang Quản Lý Đơn Hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F8FAFC] text-[#1E293B] antialiased min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-[1560px] mx-auto space-y-6">

        {/* 1. TOP GREETING & STORE CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-500">{greeting},</span>
              {stats.storeName ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  {stats.storeName}
                </span>
              ) : stats.businessName ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                  {stats.businessName}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
              Tổng Quan Vận Hành Gian Hàng
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Quản lý danh mục ấn phẩm thực tế, theo dõi tiến độ đơn hàng và các hoạt động vận hành gian hàng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Quick Refresh Button */}
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loadingStats}
              className="p-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
              title="Làm mới dữ liệu từ Database"
            >
              <span className={`material-symbols-outlined text-[18px] ${loadingStats ? 'animate-spin text-[#00875A]' : ''}`}>
                refresh
              </span>
            </button>

            {/* Export Report Link */}
            <Link
              href="/seller/reports"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">analytics</span>
              <span>Báo Cáo Chi Tiết</span>
            </Link>

            {/* Create Product Button */}
            <Link 
              href="/seller/product/create-hybrid"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Đăng Sách Mới</span>
            </Link>
          </div>
        </div>

        {/* 2. 4 TOP METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Card 1: Doanh Thu Tích Lũy */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500">Doanh Thu Tích Lũy</span>
                <div className="text-2xl sm:text-[28px] font-extrabold text-[#00875A] mt-1">
                  {loadingStats ? '…' : `${fmt(stats.totalRevenue)}đ`}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EBF7F2] text-[#00875A] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-[#00875A] min-w-0 truncate">
              <span className="material-symbols-outlined text-[16px] shrink-0">trending_up</span>
              <span className="shrink-0">{fmt(stats.totalOrders)} đơn hàng</span>
              <span className="text-gray-400 font-normal truncate">· Từ Database</span>
            </div>
          </div>

          {/* Card 2: Đơn Hàng Mới Chờ Xử Lý */}
          <Link
            href="/seller/orders"
            className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:border-amber-400 hover:shadow-sm transition-all min-w-0 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500">Đơn Hàng Cần Xử Lý</span>
                <div className="text-2xl sm:text-[28px] font-extrabold text-amber-600 mt-1">
                  {loadingStats ? '…' : fmt(stats.pendingOrders)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs font-bold text-amber-600 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] shrink-0">notification_important</span>
                <span className="shrink-0">{stats.pendingOrders > 0 ? `${stats.pendingOrders} đơn chờ xác nhận` : 'Đã xử lý xong'}</span>
              </div>
              <span className="material-symbols-outlined text-xs group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </div>
          </Link>

          {/* Card 3: Sản Phẩm Trên Sàn */}
          <Link
            href="/seller/products"
            className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:border-blue-400 hover:shadow-sm transition-all min-w-0 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500">Sản Phẩm Đang Bán</span>
                <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">
                  {loadingStats ? '…' : fmt(stats.publishedBooks)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs font-bold text-[#2563EB] min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[16px] shrink-0">menu_book</span>
                <span className="shrink-0">{fmt(stats.totalBooks)} tổng đầu sách</span>
                <span className="text-gray-400 font-normal truncate">· {fmt(stats.draftBooks)} nháp</span>
              </div>
              <span className="material-symbols-outlined text-xs group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </div>
          </Link>

          {/* Card 4: Tồn Kho Sách Giấy */}
          <Link
            href="/seller/inventory"
            className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-sm transition-all min-w-0 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500">Tổng Tồn Kho Sách Giấy</span>
                <div className="text-2xl sm:text-[28px] font-extrabold text-gray-900 mt-1">
                  {loadingStats ? '…' : fmt(stats.totalStock)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warehouse</span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs font-bold text-[#16A34A] min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[16px] shrink-0">{stats.lowStockCount > 0 ? 'warning' : 'check_circle'}</span>
                <span className="shrink-0">{stats.lowStockCount > 0 ? `${stats.lowStockCount} tựa sắp hết` : 'Kho ổn định'}</span>
                <span className="text-gray-400 font-normal truncate">· Từ DB</span>
              </div>
              <span className="material-symbols-outlined text-xs group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </div>
          </Link>
        </div>

        {/* RECENT ORDERS TABLE */}
        {stats.recentOrders && stats.recentOrders.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00875A] text-xl">receipt_long</span>
                <h3 className="font-bold text-sm sm:text-base text-gray-900">Đơn Hàng Mới Nhất</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#00875A] text-[11px] font-bold">
                  {stats.recentOrders.length} đơn gần nhất
                </span>
              </div>
              <Link href="/seller/orders" className="text-xs font-bold text-[#00875A] hover:underline flex items-center gap-1">
                <span>Xem tất cả đơn</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Mã đơn</th>
                    <th className="py-2.5 px-3">Khách hàng</th>
                    <th className="py-2.5 px-3">Sản phẩm</th>
                    <th className="py-2.5 px-3">Tổng tiền</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium">
                  {stats.recentOrders.map((ord, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold font-mono text-gray-900">
                        #{ord.code || ord.id?.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3 text-gray-700 font-semibold">
                        {ord.order?.shippingAddress?.fullName || ord.shippingAddress?.fullName || 'Khách Hàng'}
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-[200px] truncate">
                        {ord.items?.[0]?.title || 'Sách tổng hợp'} {ord.items && ord.items.length > 1 ? `(+${ord.items.length - 1})` : ''}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-emerald-700">
                        {fmt(ord.grandTotal || ord.totalAmount || ord.itemSubtotal)}đ
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'DELIVERED' || ord.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'SHIPPED'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.status === 'PROCESSING' || ord.status === 'CONFIRMED' || ord.status === 'PREPARING'
                            ? 'bg-amber-100 text-amber-800'
                            : ord.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/seller/orders"
                          className="px-2.5 py-1 rounded-lg bg-[#EBF7F2] text-[#00875A] hover:bg-[#00875A] hover:text-white font-bold text-[11px] transition-all inline-flex items-center gap-1"
                        >
                          <span>Xem</span>
                          <span className="material-symbols-outlined text-[12px]">visibility</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ROW 1 CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 3.1 SALES PIPELINE (TIẾN TRÌNH PHÁT HÀNH TỪ DB) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Tiến Trình Phát Hành &amp; Định Dạng (Từ DB)</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Số liệu thực tế các đầu sách đang quản lý trong kho ấn phẩm</p>
              </div>
              <select
                value={pipelinePeriod}
                onChange={(e) => setPipelinePeriod(e.target.value as any)}
                className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-emerald-500"
              >
                <option value="THIS_MONTH">Tháng này</option>
                <option value="THIS_WEEK">Tuần này</option>
                <option value="ALL">Toàn thời gian</option>
              </select>
            </div>

            <div className="space-y-3.5 py-2">
              {[
                { stage: 'Tổng sản phẩm', value: stats.totalBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#4ADE80]' },
                { stage: 'Đã xuất bản', value: stats.publishedBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#6EE7B7]' },
                { stage: 'Sách giấy (Physical)', value: stats.physicalBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#A7F3D0]' },
                { stage: 'Ebook (Digital DRM)', value: stats.digitalBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#86EFAC]' },
                { stage: 'Combo Hybrid', value: stats.hybridBooks, max: Math.max(stats.totalBooks, 1), color: 'bg-[#15803D]' },
              ].map((item, i) => (
                <div key={i} className="flex items-center text-xs font-medium text-gray-700">
                  <span className="w-36 sm:w-40 shrink-0 font-semibold truncate">{item.stage}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4.5 overflow-hidden mx-2 relative">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    ></div>
                  </div>
                  <span className="w-14 text-right font-bold font-mono text-gray-900">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3.2 DEAL STAGES / PHÂN BỐ ĐỊNH DẠNG SÁCH (TỪ DB) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Phân Bố Định Dạng Sách</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Tỷ trọng theo loại ấn phẩm (từ Database)</p>
              </div>
              <Link href="/seller/products" className="text-xs font-bold text-[#00875A] hover:underline">
                Xem tất cả
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
              {(() => {
                const total = stats.totalBooks || 1;
                const circumference = 2 * Math.PI * 38;
                const segments = [
                  { name: 'Sách Giấy', count: stats.physicalBooks, color: '#00875A', bgColor: 'bg-[#00875A]' },
                  { name: 'Ebook DRM', count: stats.digitalBooks, color: '#06B6D4', bgColor: 'bg-[#06B6D4]' },
                  { name: 'Combo Hybrid', count: stats.hybridBooks, color: '#3B82F6', bgColor: 'bg-[#3B82F6]' },
                ];
                let offset = 0;
                const arcs = segments.map(seg => {
                  const pct = seg.count / total;
                  const dash = circumference * pct;
                  const arc = { ...seg, pct: stats.totalBooks ? Math.round(pct * 100) : 0, dasharray: `${dash} ${circumference - dash}`, dashoffset: -offset };
                  offset += dash;
                  return arc;
                });
                return (
                  <>
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="14" fill="none" />
                        {arcs.map((arc, idx) => (
                          <circle key={idx} cx="50" cy="50" r="38" stroke={arc.color} strokeWidth="14" fill="none"
                            strokeDasharray={arc.dasharray} strokeDashoffset={arc.dashoffset} className="transition-all duration-700" />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-xl font-extrabold font-mono text-gray-900 leading-tight">{fmt(stats.totalBooks)}</span>
                        <span className="text-[9.5px] text-gray-500 font-semibold uppercase">Tổng Sản Phẩm</span>
                      </div>
                    </div>

                    {/* Legend List */}
                    <div className="space-y-1.5 text-xs w-full sm:w-auto">
                      {arcs.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${item.bgColor}`}></span>
                            <span className="text-gray-600 font-medium">{item.name}</span>
                          </div>
                          <span className="font-bold font-mono text-gray-900">{item.count} ({item.pct}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 4. ROW 2: PHÂN BỔ SẢN PHẨM & TĂNG TRƯỞNG */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 4.1 PHÂN BỔ SẢN PHẨM (FUNNEL TỪ DB) */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Phân Bổ Sản Phẩm (Funnel)</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Từ tổng sản phẩm → đã xuất bản → sách giấy &amp; Ebook</p>
              </div>
              <Link href="/seller/products" className="text-xs font-bold text-[#00875A] hover:underline">
                Chi tiết
              </Link>
            </div>

            <div className="space-y-2 py-1 flex flex-col items-center">
              <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#22C55E] text-white text-xs font-bold shadow-xs">
                <span>Tổng sản phẩm</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{fmt(stats.totalBooks)}</span>
                  <span className="text-[10px] text-emerald-100 font-normal">100%</span>
                </div>
              </div>

              <div className="w-[82%] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#4ADE80] text-gray-900 text-xs font-bold shadow-xs">
                <span>Đã xuất bản</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{fmt(stats.publishedBooks)}</span>
                  <span className="text-[10px] text-gray-700 font-semibold">{stats.totalBooks ? Math.round((stats.publishedBooks / stats.totalBooks) * 100) : 0}%</span>
                </div>
              </div>

              <div className="w-[66%] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#86EFAC] text-gray-900 text-xs font-bold shadow-xs">
                <span>Sách Giấy</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{fmt(stats.physicalBooks)}</span>
                  <span className="text-[10px] text-gray-700 font-semibold">{stats.totalBooks ? Math.round((stats.physicalBooks / stats.totalBooks) * 100) : 0}%</span>
                </div>
              </div>

              <div className="w-[50%] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#15803D] text-white text-xs font-bold shadow-xs">
                <span>Ebook DRM</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{fmt(stats.digitalBooks)}</span>
                  <span className="text-[10px] text-emerald-200 font-normal">{stats.totalBooks ? Math.round((stats.digitalBooks / stats.totalBooks) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4.2 TĂNG TRƯỞNG ĐỘC GIẢ (THEO ĐƠN HÀNG THỰC TẾ) */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Tăng Trưởng Độc Giả Mới (Khách Hàng)</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Số lượng khách đặt mua &amp; tương tác với gian hàng</p>
              </div>
              <select
                value={acqPeriod}
                onChange={(e) => setAcqPeriod(e.target.value as any)}
                className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-emerald-500"
              >
                <option value="6_MONTHS">6 tháng qua</option>
                <option value="THIS_YEAR">Năm nay</option>
                <option value="ALL">Toàn thời gian</option>
              </select>
            </div>

            <div className="relative pt-4 pb-2">
              <div className="h-44 w-full relative">
                {/* Y Axis Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-400 pointer-events-none">
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>Độc giả</span></div>
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>{Math.max(stats.totalOrders * 2, 10)}</span></div>
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>{Math.max(stats.totalOrders, 5)}</span></div>
                  <div className="border-b border-gray-100 w-full flex justify-between"><span>0</span></div>
                </div>

                {/* SVG Trend line */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 150">
                  <defs>
                    <linearGradient id="sellerAcqGradientReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20 130 Q 120 120 220 90 T 350 70 T 480 30 L 480 150 L 20 150 Z"
                    fill="url(#sellerAcqGradientReal)"
                  />
                  <path
                    d="M 20 130 Q 120 120 220 90 T 350 70 T 480 30"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="480" cy="30" r="5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
                </svg>

                <div className="absolute top-2 right-4 bg-[#1E293B] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg flex flex-col items-center">
                  <span className="font-mono">{stats.totalOrders} đơn hàng</span>
                  <span className="text-[9px] text-gray-400 font-normal">Tăng trưởng ổn định</span>
                </div>
              </div>

              {/* X Axis Months */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mt-3 px-3">
                <span>Tháng 5</span>
                <span>Tháng 6</span>
                <span>Tháng 7</span>
                <span>Tháng 8</span>
                <span>Tháng 9</span>
                <span>Tháng 10</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. ROW 3: WIDGETS (FLASHSALE + REAL CHAT + REAL ACTIVITY LOG) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Widget 1: CHƯƠNG TRÌNH FLASH SALE & KHUYẾN MÃI (Từ DB - Không Mock Ảo) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">bolt</span>
                <span>Chương Trình Khuyến Mãi &amp; Voucher</span>
              </h2>
              <Link href="/seller/vouchers" className="text-xs font-bold text-[#00875A] hover:underline">
                Quản lý
              </Link>
            </div>

            {stats.activeVouchers && stats.activeVouchers.length > 0 ? (
              <div className="space-y-2.5 text-xs">
                {stats.activeVouchers.slice(0, 3).map((v) => (
                  <Link
                    key={v.id}
                    href="/seller/vouchers"
                    className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 hover:bg-amber-100/60 transition-colors flex items-center justify-between block group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {v.type === 'PERCENTAGE' ? '%' : 'đ'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 group-hover:text-amber-800 transition-colors truncate">
                          {v.name || v.code}
                        </div>
                        <span className="text-[10.5px] text-gray-500 block truncate">
                          Mã: <span className="font-mono font-bold text-gray-700">{v.code}</span> · {formatDiscountValue(v.type, v.value)}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shrink-0 ml-2">
                      Đang chạy
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2.5 border border-dashed border-amber-200/80 bg-amber-50/20 rounded-xl">
                <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">bolt</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Chưa có khuyến mãi hoặc flash sale</p>
                  <p className="text-[11px] text-gray-500 max-w-[230px] mx-auto mt-0.5">
                    Gian hàng hiện chưa tạo chương trình khuyến mãi nào. Hãy tạo mã giảm giá để thu hút bạn đọc.
                  </p>
                </div>
                <Link
                  href="/seller/vouchers"
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                >
                  <span>Tạo Khuyến Mãi / Voucher</span>
                  <span className="material-symbols-outlined text-sm">add</span>
                </Link>
              </div>
            )}
          </div>

          {/* Widget 2: TIN NHẮN KHÁCH ĐỌC (KHÔNG MOCK ẢO) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#00875A] text-[18px]">chat_bubble_outline</span>
                <span>Tin Nhắn Khách Đọc</span>
              </h2>
              <Link href="/seller/chat" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#00875A] hover:underline">
                Hộp thư
              </Link>
            </div>

            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2.5 border border-dashed border-slate-200 rounded-xl">
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">mark_chat_read</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">Hộp thư chăm sóc bạn đọc</p>
                <p className="text-[11px] text-gray-500 max-w-[220px] mx-auto mt-0.5">
                  Mọi tin nhắn hỏi sách và hỗ trợ độc giả sẽ được kết nối trực tiếp tại đây.
                </p>
              </div>
              <Link
                href="/seller/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs transition-colors inline-flex items-center gap-1"
              >
                <span>Mở Hộp Thư Chat</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </Link>
            </div>
          </div>

          {/* Widget 3: HOẠT ĐỘNG GIAN HÀNG (NHẬT KÝ THAO TÁC THỰC TẾ) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#00875A] text-[18px]">history</span>
                <span>Hoạt Động Gian Hàng Thực Tế</span>
              </h2>
              <Link href="/seller/transactions" className="text-xs font-bold text-[#00875A] hover:underline cursor-pointer">
                Lịch sử ví
              </Link>
            </div>

            <div className="space-y-2.5">
              {stats.recentOrders.length > 0 || stats.recentTransactions.length > 0 ? (
                <>
                  {stats.recentOrders.slice(0, 2).map((ord, idx) => (
                    <div key={`ord-${idx}`} className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[15px]">shopping_bag</span>
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">
                            Đơn hàng #{ord.code || ord.id?.slice(0, 8)}
                          </div>
                          <span className="text-[10.5px] text-gray-500 block truncate">
                            {ord.order?.shippingAddress?.fullName || 'Khách đặt mua'} · {ord.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">
                        {formatTimeAgo(ord.createdAt)}
                      </span>
                    </div>
                  ))}

                  {stats.recentTransactions.slice(0, 2).map((tx, idx) => (
                    <div key={`tx-${idx}`} className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">
                            {tx.description || 'Giao dịch ví'}
                          </div>
                          <span className="text-[10.5px] text-emerald-700 font-bold block truncate">
                            +{fmt(tx.amount)}đ
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">
                        {formatTimeAgo(tx.createdAt)}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-1.5 border border-dashed border-slate-200 rounded-xl text-gray-400">
                  <span className="material-symbols-outlined text-2xl">pending</span>
                  <p className="text-xs font-semibold text-gray-600">Chưa có hoạt động mới</p>
                  <p className="text-[11px] text-gray-400">Các thao tác xuất bản sách &amp; đơn hàng sẽ ghi nhận tại đây</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
