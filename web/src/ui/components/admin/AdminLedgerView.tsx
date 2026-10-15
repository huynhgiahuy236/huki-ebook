"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  platformFinanceService,
  type PlatformCashFlowSummary,
  type LedgerTransactionItem,
  type LedgerFilterParams,
  type FinancialRealtimeEvent,
} from '../../services/platformFinanceService';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

export function AdminLedgerView() {
  const { showToast } = useToast();

  // Metrics States
  const [metrics, setMetrics] = useState<PlatformCashFlowSummary | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Ledger Table States
  const [transactions, setTransactions] = useState<LedgerTransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Stores dropdown list
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);

  // Real-time Activity Indicator
  const [lastLiveEvent, setLastLiveEvent] = useState<string | null>(null);
  const [isLivePulsing, setIsLivePulsing] = useState(false);
  const pulseTimerRef = useRef<number | null>(null);

  // Preload stores for filter dropdown
  useEffect(() => {
    let mounted = true;
    adminApi.getBusinesses({ limit: 100 }).then((res) => {
      if (!mounted || !res.success || !Array.isArray(res.data)) return;
      const list: Array<{ id: string; name: string }> = [];
      res.data.forEach((b) => {
        if (Array.isArray(b.stores)) {
          b.stores.forEach((s) => {
            if (s.id && s.name) {
              list.push({ id: s.id, name: s.name });
            }
          });
        }
      });
      setStores(list);
    }).catch((err) => {
      console.warn('[AdminLedgerView] Failed to fetch stores for dropdown:', err);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch KPI Metrics
  const loadMetrics = useCallback(async (targetStoreId = storeFilter) => {
    setLoadingMetrics(true);
    try {
      const data = await platformFinanceService.fetchCashFlowMetrics({
        storeId: targetStoreId || undefined,
      });
      setMetrics(data);
    } catch (err) {
      console.error('[AdminLedgerView] Error loading metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [storeFilter]);

  // Fetch Ledger Transactions
  const loadLedger = useCallback(async (targetPage = page, targetLimit = limit) => {
    setLoadingLedger(true);
    try {
      const params: LedgerFilterParams = {
        page: targetPage,
        limit: targetLimit,
        storeId: storeFilter || undefined,
        type: typeFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search.trim() || undefined,
      };

      const res = await platformFinanceService.fetchLedgerTransactions(params);
      setTransactions(res.items);
      setTotal(res.total);
      setPage(res.page);
      setLimit(res.limit);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('[AdminLedgerView] Error loading ledger:', err);
      setTransactions([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoadingLedger(false);
    }
  }, [page, limit, storeFilter, typeFilter, dateFrom, dateTo, search]);

  // Initial load and filter change trigger
  useEffect(() => {
    loadMetrics(storeFilter);
    loadLedger(1, limit);
  }, [loadMetrics, loadLedger, storeFilter, typeFilter, dateFrom, dateTo, limit]);

  // Refs for stable realtime event handling
  const pageRef = useRef(page);
  pageRef.current = page;
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const loadLedgerRef = useRef(loadLedger);
  loadLedgerRef.current = loadLedger;
  const loadMetricsRef = useRef(loadMetrics);
  loadMetricsRef.current = loadMetrics;

  // Real-time Event Subscription (Zero Page Reload)
  useEffect(() => {
    const unsubscribe = platformFinanceService.subscribeToRealtimeFinancialEvents(
      (event: FinancialRealtimeEvent) => {
        // Trigger live pulse animation
        setIsLivePulsing(true);
        if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = window.setTimeout(() => setIsLivePulsing(false), 3000);

        let eventText = 'Có biến động tài chính mới';
        if (event.eventType === 'ORDER_PAYMENT_SUCCEEDED') eventText = 'Nhận thanh toán đơn hàng mới (Ký quỹ)';
        if (event.eventType === 'ESCROW_RELEASED') eventText = 'Đơn hàng hoàn tất - Quyết toán sang ví người bán';
        if (event.eventType === 'PAYOUT_DISBURSED') eventText = 'Giải ngân thành công ra tài khoản ngân hàng';
        if (event.eventType === 'WALLET_BALANCE_UPDATED') eventText = 'Cập nhật số dư ví gian hàng';
        if (event.eventType === 'SELLER_PENALTY_UPDATED') eventText = 'Áp dụng chế tài phạt gian hàng vi phạm';
        if (event.eventType === 'ESCROW_FROZEN') eventText = 'Đóng băng ký quỹ do phát sinh khiếu nại';
        if (event.eventType === 'ESCROW_REFUNDED') eventText = 'Hoàn trả ký quỹ về cho người mua';

        setLastLiveEvent(`${eventText} (${new Date(event.timestamp).toLocaleTimeString('vi-VN')})`);
        showToast(eventText, 'info');

        // Silently refresh both metrics and ledger list
        loadMetricsRef.current();
        loadLedgerRef.current(pageRef.current, limitRef.current);
      }
    );

    return () => {
      unsubscribe();
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [showToast]);

  // Handle Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLedger(1, limit);
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    if (transactions.length === 0) {
      showToast('Chưa có giao dịch sổ cái để xuất CSV', 'info');
      return;
    }
    const csvContent = platformFinanceService.exportLedgerToCsv(transactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `so_cai_dong_tien_huki_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống sổ cái dòng tiền (CSV)', 'success');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStoreFilter('');
    setDateFrom('');
    setDateTo('');
    loadLedger(1, limit);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* 1. REALTIME STATUS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className={`w-3.5 h-3.5 rounded-full ${isLivePulsing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
            <span className={`absolute w-2 h-2 rounded-full ${isLivePulsing ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                Sổ Cái &amp; Dòng Tiền Realtime
              </span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                100% Real Backend Data
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {lastLiveEvent ? (
                <span className="text-amber-300 font-medium">⚡ Sự kiện mới: {lastLiveEvent}</span>
              ) : (
                'Đang đồng bộ trực tiếp với kênh thanh toán, ví và tài khoản ký quỹ sàn.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              loadMetrics();
              loadLedger(page, limit);
              showToast('Đã làm mới dữ liệu sổ cái', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Làm Mới</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Xuất Sổ Cái (CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. FIVE CANONICAL CASH FLOW KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Platform Net Commission */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Hoa Hồng Thực Nhận Sàn</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 tracking-tight">
            {loadingMetrics ? (
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              platformFinanceService.formatVND(metrics?.platformCommission)
            )}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            Platform Take Rate (5% - 10%)
          </p>
        </div>

        {/* KPI 2: Active Escrow Pool */}
        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Quỹ Ký Quỹ Đang Giữ</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 tracking-tight">
            {loadingMetrics ? (
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              platformFinanceService.formatVND(metrics?.escrowBalance)
            )}
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">
            {metrics?.activeEscrowItemsCount ? `${metrics.activeEscrowItemsCount} món hàng trong Escrow` : 'Chờ hoàn tất & hết hạn đổi trả'}
          </p>
        </div>

        {/* KPI 3: Seller Wallet Liability */}
        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Tổng Số Dư Ví Các Shop</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 tracking-tight">
            {loadingMetrics ? (
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              platformFinanceService.formatVND(metrics?.sellerWalletLiability)
            )}
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            Nghĩa vụ nợ ví (Available + Pending)
          </p>
        </div>

        {/* KPI 4: Disbursed Payouts */}
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Đã Giải Ngân Ra Ngân Hàng</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 tracking-tight">
            {loadingMetrics ? (
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              platformFinanceService.formatVND(metrics?.disbursedPayouts)
            )}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">
            Dòng tiền rời sàn về tài khoản Shop
          </p>
        </div>

        {/* KPI 5: Penalties Collected */}
        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">Tiền Phạt Sao Quả Tạ</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 tracking-tight">
            {loadingMetrics ? (
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              platformFinanceService.formatVND(metrics?.penaltiesCollected)
            )}
          </div>
          <p className="text-[11px] text-rose-600 font-medium mt-1">
            Thu hồi từ chế tài vi phạm gian hàng
          </p>
        </div>
      </div>

      {/* 3. MULTI-DIMENSIONAL FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã GD, mã đơn hàng, tên gian hàng..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="">Tất cả loại dòng tiền</option>
              <option value="CREDIT_PENDING">Ký quỹ tiền hàng (Escrow Inflow)</option>
              <option value="CREDIT_AVAILABLE">Ghi có ví Shop (Seller Credit)</option>
              <option value="MOVE_PENDING_TO_AVAILABLE">Quyết toán Escrow (Settlement)</option>
              <option value="DEBIT_AVAILABLE">Giải ngân ngân hàng (Payout)</option>
              <option value="COMMISSION_EARNED">Hoa hồng chiết khấu sàn</option>
              <option value="PENALTY_DEDUCTION">Phạt vi phạm Sao Quả Tạ</option>
            </select>

            {/* Filter by Store */}
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-[200px] truncate"
            >
              <option value="">Tất cả gian hàng</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none"
                title="Từ ngày"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none"
                title="Đến ngày"
              />
            </div>

            {/* Filter Action Buttons */}
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Lọc
            </button>
            {(search || typeFilter || storeFilter || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-all cursor-pointer"
                title="Xóa bộ lọc"
              >
                Đặt Lại
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 4. DETAILED FINANCIAL LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-500 text-[20px]">table_chart</span>
            <h3 className="text-sm font-bold text-gray-900">Bảng Kê Sổ Cái Giao Dịch Dòng Tiền Toàn Sàn</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {total > 0 ? `Tổng cộng ${total.toLocaleString('vi-VN')} bản ghi` : '0 giao dịch'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600 border-b border-gray-100 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Mã Giao Dịch</th>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4">Loại Dòng Tiền</th>
                <th className="py-3 px-4">Chiều GD</th>
                <th className="py-3 px-4">Gian Hàng</th>
                <th className="py-3 px-4">Mã Đơn Hàng</th>
                <th className="py-3 px-4 text-right">Số Tiền (VNĐ)</th>
                <th className="py-3 px-4 text-right">Số Dư Sau GD</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Diễn Giải Kế Toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loadingLedger ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-emerald-600 text-3xl">progress_activity</span>
                      <span className="text-xs font-semibold">Đang truy vấn sổ cái thực tế từ cơ sở dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                /* 100% REAL EMPTY STATE */
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-3 border border-gray-100">
                        <span className="material-symbols-outlined text-3xl text-gray-300">receipt_long</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-700">Chưa Có Giao Dịch Dòng Tiền Trong Kỳ</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Hệ thống chưa ghi nhận biến động số dư hoặc giao dịch nào phù hợp với bộ lọc hiện tại.
                        Khi phát sinh đơn hàng, ký quỹ hoặc rút tiền, các bút toán sẽ tự động hiển thị thời gian thực.
                      </p>
                      {(search || typeFilter || storeFilter || dateFrom || dateTo) && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-4 px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-all cursor-pointer"
                        >
                          Xóa Bộ Lọc Để Xem Toàn Bộ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.flowDirection === 'INFLOW';
                  const isNegative = tx.flowDirection === 'OUTFLOW';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Transaction ID */}
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-800 font-semibold" title={tx.id}>
                          {tx.id.length > 12 ? `${tx.id.substring(0, 10)}...` : tx.id}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(tx.timestamp).toLocaleString('vi-VN')}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.type === 'CREDIT_PENDING'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : tx.type === 'CREDIT_AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.type === 'MOVE_PENDING_TO_AVAILABLE'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : tx.type === 'DEBIT_AVAILABLE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : tx.type === 'COMMISSION_EARNED'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : tx.type === 'PENALTY_DEDUCTION'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {tx.type}
                        </span>
                      </td>

                      {/* Flow Direction */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isPositive && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                            <span>Vào Sàn (+)</span>
                          </span>
                        )}
                        {isNegative && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                            <span>Ra Ngoài (-)</span>
                          </span>
                        )}
                        {!isPositive && !isNegative && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                            <span className="material-symbols-outlined text-[14px]">sync_alt</span>
                            <span>Luân Chuyển</span>
                          </span>
                        )}
                      </td>

                      {/* Store Name */}
                      <td className="py-3 px-4 text-gray-800 font-semibold max-w-[180px] truncate" title={tx.storeName}>
                        {tx.storeName || 'Toàn Sàn'}
                      </td>

                      {/* Order Code */}
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                        {tx.orderCode ? (
                          <span className="text-blue-600 font-bold hover:underline cursor-pointer">
                            #{tx.orderCode}
                          </span>
                        ) : tx.orderId ? (
                          <span className="text-gray-500">#{tx.orderId.substring(0, 8)}</span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Amount */}
                      <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                        isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-gray-900'
                      }`}>
                        {isPositive ? '+' : isNegative ? '-' : ''}
                        {platformFinanceService.formatVND(tx.amount)}
                      </td>

                      {/* Balance After */}
                      <td className="py-3 px-4 text-right text-gray-600 font-mono text-[11px] whitespace-nowrap">
                        {tx.balanceAfter !== undefined
                          ? platformFinanceService.formatVND(tx.balanceAfter)
                          : '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Thành Công
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={tx.description}>
                        {tx.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION CONTROLS */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Record range */}
          <div className="text-gray-500 font-medium">
            {total > 0 ? (
              <span>
                Hiển thị <strong className="text-gray-800">{(page - 1) * limit + 1}</strong> -{' '}
                <strong className="text-gray-800">{Math.min(page * limit, total)}</strong> trên tổng số{' '}
                <strong className="text-gray-800">{total.toLocaleString('vi-VN')}</strong> giao dịch
              </span>
            ) : (
              <span>0 giao dịch</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Rows per page selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Số dòng/trang:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  loadLedger(1, newLimit);
                }}
                className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>

            {/* Page navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadLedger(1, limit)}
                disabled={page <= 1 || loadingLedger}
                className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Trang đầu"
              >
                <span className="material-symbols-outlined text-[16px]">first_page</span>
              </button>
              <button
                onClick={() => loadLedger(page - 1, limit)}
                disabled={page <= 1 || loadingLedger}
                className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Trang trước"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>

              <span className="px-3 py-1 font-bold text-gray-800 bg-white border border-gray-200 rounded-lg">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => loadLedger(page + 1, limit)}
                disabled={page >= totalPages || loadingLedger}
                className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Trang sau"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button
                onClick={() => loadLedger(totalPages, limit)}
                disabled={page >= totalPages || loadingLedger}
                className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Trang cuối"
              >
                <span className="material-symbols-outlined text-[16px]">last_page</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLedgerView;
