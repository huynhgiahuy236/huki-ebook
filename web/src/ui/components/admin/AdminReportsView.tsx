"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  analyticsApi,
  type PlatformGmvResponse,
  type BestsellerItem,
} from '../../api/analyticsApi';
import { exportGmvAnalyticsToCsv } from '../../utils/csvExport';
import { KPICard } from '../analytics/KPICard';
import { GMVChart } from '../analytics/GMVChart';
import { TopSellersTable } from '../analytics/TopSellersTable';
import { TopProductsTable } from '../analytics/TopProductsTable';

function formatVND(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return '0 ₫';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

type DatePreset = '7D' | '30D' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL_TIME' | 'CUSTOM';

function getInitialDates(): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatDateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const past30 = new Date();
  past30.setDate(now.getDate() - 29);
  return {
    from: formatDateOnly(past30),
    to: formatDateOnly(now),
  };
}

export function AdminReportsView() {
  const { showToast } = useToast();
  const { user } = useAuth();

  // Filter States with initial 30D values
  const [preset, setPreset] = useState<DatePreset>('30D');
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [fromDate, setFromDate] = useState<string>(() => getInitialDates().from);
  const [toDate, setToDate] = useState<string>(() => getInitialDates().to);
  const [customError, setCustomError] = useState<string | null>(null);

  // Bestsellers Sort Mode
  const [bestsellerMode, setBestsellerMode] = useState<'UNITS' | 'GMV'>('UNITS');

  // Data States
  const [gmvData, setGmvData] = useState<PlatformGmvResponse | null>(null);
  const [bestsellers, setBestsellers] = useState<BestsellerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBestsellers, setLoadingBestsellers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh interval ref (5 minutes)
  const timerRef = useRef<number | null>(null);

  // Calculate preset dates safely (date-only)
  const applyPreset = useCallback((targetPreset: DatePreset) => {
    setPreset(targetPreset);
    setCustomError(null);

    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatDateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (targetPreset === '7D') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 6);
      setFromDate(formatDateOnly(past7));
      setToDate(formatDateOnly(now));
      setInterval('daily');
    } else if (targetPreset === '30D') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 29);
      setFromDate(formatDateOnly(past30));
      setToDate(formatDateOnly(now));
      setInterval('daily');
    } else if (targetPreset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatDateOnly(firstDay));
      setToDate(formatDateOnly(now));
      setInterval('daily');
    } else if (targetPreset === 'THIS_YEAR') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      setFromDate(formatDateOnly(firstDayYear));
      setToDate(formatDateOnly(now));
      setInterval('monthly');
    } else if (targetPreset === 'ALL_TIME') {
      setFromDate('');
      setToDate('');
      setInterval('monthly');
    }
  }, []);

  // Main Data Fetcher
  const fetchData = useCallback(
    async (isManual: boolean = false) => {
      if (isManual) setIsRefreshing(true);
      setError(null);

      // Validate date order if both present
      if (fromDate && toDate && fromDate > toDate) {
        setCustomError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
        if (isManual) setIsRefreshing(false);
        return;
      } else {
        setCustomError(null);
      }

      try {
        const [gmvRes, bestsellersRes] = await Promise.allSettled([
          analyticsApi.getPlatformGmv({
            from: fromDate || null,
            to: toDate || null,
            interval,
          }),
          analyticsApi.getPlatformBestsellers({
            from: fromDate || null,
            to: toDate || null,
            by: bestsellerMode,
            limit: 10,
          }),
        ]);

        // Process GMV Response
        if (gmvRes.status === 'fulfilled' && gmvRes.value.success && gmvRes.value.data) {
          setGmvData(gmvRes.value.data);
        } else if (gmvRes.status === 'fulfilled' && !gmvRes.value.success) {
          setError(gmvRes.value.error?.message || 'Không thể tải báo cáo GMV');
        } else if (gmvRes.status === 'rejected') {
          setError('Lỗi mạng hoặc máy chủ phân tích không phản hồi');
        }

        // Process Bestsellers Response
        if (
          bestsellersRes.status === 'fulfilled' &&
          bestsellersRes.value.success &&
          bestsellersRes.value.data
        ) {
          setBestsellers(bestsellersRes.value.data.items || []);
        } else {
          setBestsellers([]);
        }

        setLastRefreshedAt(new Date());
        if (isManual) {
          showToast('Đã làm mới dữ liệu phân tích thành công', 'success');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu phân tích';
        setError(message);
      } finally {
        setLoading(false);
        setLoadingBestsellers(false);
        setIsRefreshing(false);
      }
    },
    [fromDate, toDate, interval, bestsellerMode, showToast]
  );

  // Trigger fetch whenever filters change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchData]);

  // Set up 5-minute auto-refresh polling (AUTO_REFRESH_INTERVAL = 5 MINUTES)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      fetchData(false);
    }, 5 * 60 * 1000); // 300,000ms

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [fetchData]);

  // Safe Derived AOV (Display-only)
  const aov =
    gmvData && gmvData.completedOrders > 0
      ? Number(gmvData.totalGmv) / gmvData.completedOrders
      : 0;

  // Handle Export Actions
  const handleExportCsv = () => {
    if (!gmvData) {
      showToast('Chưa có dữ liệu để xuất CSV', 'info');
      return;
    }
    exportGmvAnalyticsToCsv(gmvData);
    showToast('Đã tải xuống tệp báo cáo GMV (CSV)', 'success');
  };

  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Auth Guard
  const isPlatformAdmin =
    user?.role === 'PLATFORM_ADMIN' || user?.role === 'ADMIN';

  if (!isPlatformAdmin && !loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white rounded-2xl border border-rose-200 mt-6">
        <span className="material-symbols-outlined text-rose-500 text-4xl mb-2">lock</span>
        <h2 className="text-lg font-bold text-gray-900">Từ Chối Truy Cập</h2>
        <p className="text-xs text-gray-500 mt-1">
          Báo cáo phân tích GMV toàn sàn chỉ dành cho Quản trị viên (Platform Admin).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1600px] mx-auto print:w-full print:p-0">
      {/* 1. TOP EXECUTIVE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Trung Tâm Dữ Liệu &amp; Phân Tích</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
              BÁO CÁO GMV TOÀN SÀN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Báo Cáo Phân Tích &amp; GMV Toàn Sàn
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tổng hợp dữ liệu doanh số tổng (Gross Merchandise Value), số đơn hàng hoàn tất &amp; xếp hạng gian hàng.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
          {/* Refresh status indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-[11px] font-medium text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Tự động làm mới mỗi 5 phút</span>
            {lastRefreshedAt && (
              <span className="text-gray-400 font-mono">
                • {lastRefreshedAt.toLocaleTimeString('vi-VN')}
              </span>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
            title="Làm mới dữ liệu ngay"
          >
            <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
              refresh
            </span>
            <span>{isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-bold text-xs transition-all shadow-2xs cursor-pointer"
            title="Tải tệp CSV phân tích"
          >
            <span className="material-symbols-outlined text-[16px] text-[#00875A]">csv</span>
            <span>Xuất CSV</span>
          </button>

          {/* Print / PDF Button */}
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
            title="In báo cáo hoặc lưu dưới dạng PDF"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>In Báo Cáo (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-gray-500 mr-1">Khoảng thời gian:</span>
          {[
            { id: '7D', label: '7 Ngày' },
            { id: '30D', label: '30 Ngày' },
            { id: 'THIS_MONTH', label: 'Tháng Này' },
            { id: 'THIS_YEAR', label: 'Năm Nay' },
            { id: 'ALL_TIME', label: 'Toàn Bộ Dữ Liệu' },
            { id: 'CUSTOM', label: 'Tùy Chỉnh' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => applyPreset(item.id as DatePreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                preset === item.id
                  ? 'bg-[#00875A] text-white shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Range Inputs & Interval Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {preset === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#00875A]"
              />
              <span className="text-xs text-gray-400">đến</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#00875A]"
              />
            </div>
          )}

          {/* Interval Selector */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
            <span className="text-xs font-bold text-gray-500">Chu kỳ:</span>
            <select
              value={interval}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setInterval(e.target.value as 'daily' | 'weekly' | 'monthly')
              }
              className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#00875A]"
            >
              <option value="daily">Theo Ngày (Daily)</option>
              <option value="weekly">Theo Tuần (Weekly ISO)</option>
              <option value="monthly">Theo Tháng (Monthly)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date validation warning */}
      {customError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{customError}</span>
        </div>
      )}

      {/* API Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] hover:bg-rose-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 3. FOUR CANONICAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total GMV */}
        <KPICard
          title="Tổng GMV Toàn Sàn"
          value={formatVND(gmvData?.totalGmv)}
          icon="payments"
          subtitle="Tổng giá trị giao dịch hoàn tất (Gross)"
          color="emerald"
          loading={loading}
        />

        {/* KPI 2: Completed Orders */}
        <KPICard
          title="Đơn Hàng Hoàn Tất"
          value={gmvData?.completedOrders ? gmvData.completedOrders.toLocaleString('vi-VN') : '0'}
          icon="shopping_bag"
          subtitle="Số đơn hàng thành công (ORDER_COMPLETED)"
          color="blue"
          loading={loading}
        />

        {/* KPI 3: Average Order Value (AOV) */}
        <KPICard
          title="Giá Trị Trung Bình / Đơn"
          value={formatVND(aov)}
          icon="receipt_long"
          subtitle={
            gmvData && gmvData.completedOrders > 0
              ? `AOV = Tổng GMV / ${gmvData.completedOrders} đơn`
              : 'Chưa có đơn hàng phát sinh'
          }
          color="amber"
          loading={loading}
        />

        {/* KPI 4: Canonical Growth % */}
        <KPICard
          title="Tăng Trưởng GMV"
          value="Chưa khả dụng"
          icon="trending_up"
          subtitle="Chưa có quy tắc so sánh kỳ trước được xác nhận"
          color="gray"
          loading={loading}
        />
      </div>

      {/* 4. GMV TIMELINE TREND CHART */}
      <GMVChart
        timeline={gmvData?.timeline || []}
        interval={interval}
        loading={loading}
      />

      {/* 5. TWO-COLUMN DISTRIBUTION & BESTSELLERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Top Stores / Sellers */}
        <div className="lg:col-span-6">
          <TopSellersTable
            byStore={gmvData?.byStore || []}
            totalGmv={gmvData?.totalGmv || '0'}
            loading={loading}
          />
        </div>

        {/* Right Column: Platform Bestsellers */}
        <div className="lg:col-span-6">
          <TopProductsTable
            items={bestsellers}
            rankingBy={bestsellerMode}
            onRankingByChange={setBestsellerMode}
            loading={loadingBestsellers}
          />
        </div>
      </div>

      {/* 6. HONEST DATA GAP & ARCHITECTURE NOTICE */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs text-gray-600 space-y-1.5 print:hidden">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <span className="material-symbols-outlined text-gray-500 text-[18px]">info</span>
          <span>Ghi Chú Về Phạm Vi Dữ Liệu &amp; Nguồn Đo Lường</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          • <strong>Doanh số GMV:</strong> Được tính toán chính thức từ các sự kiện <code>ORDER_COMPLETED</code> trong Analytics Database, bảo toàn định dạng số thực <code>Decimal(15,2)</code>.
        </p>
        <p className="text-[11px] leading-relaxed">
          • <strong>Phân loại thể loại &amp; Khu vực:</strong> Báo cáo theo Danh mục sách (Category GMV), Vùng miền (Region) và Bộ lọc gian hàng toàn sàn hiện đang là GAP dữ liệu chưa được index trong pipeline batch rollup và sẽ được hỗ trợ trong các phiên bản cập nhật tiếp theo.
        </p>
      </div>
    </div>
  );
}

export default AdminReportsView;
