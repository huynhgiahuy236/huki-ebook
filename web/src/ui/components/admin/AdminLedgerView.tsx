"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  platformFinanceService,
  type PlatformCashFlowSummary,
  type LedgerTransactionItem,
  type LedgerFilterParams,
  type FinancialRealtimeEvent,
} from '../../services/platformFinanceService';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import GroupedDataTable, { type Column } from '../common/GroupedDataTable';

export interface LedgerOrderGroup {
  id: string; // groupKey
  orderCode?: string;
  orderId?: string;
  storeName: string;
  storeId?: string;
  latestTimestamp: string;
  transactionCount: number;
  totalInflow: number;
  totalOutflow: number;
  netAmount: number;
  latestBalanceAfter?: number;
  primaryDirection: 'INFLOW' | 'OUTFLOW' | 'INTERNAL_TRANSFER';
  primaryType: string;
  status: 'COMPLETED' | 'PENDING' | 'REVERSED';
  summaryDescription: string;
  items: LedgerTransactionItem[];
}

function formatVietnamDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function AdminLedgerView() {
  const { showToast } = useToast();

  // Metrics States
  const [metrics, setMetrics] = useState<PlatformCashFlowSummary | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Raw Transactions from API
  const [transactions, setTransactions] = useState<LedgerTransactionItem[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expandable Accordion Keys
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([]);

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

  // Fetch Ledger Transactions (Load comprehensive list to group cleanly)
  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const params: LedgerFilterParams = {
        page: 1,
        limit: 100, // Fetch all available transactions to group properly
        storeId: storeFilter || undefined,
        type: typeFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search.trim() || undefined,
      };

      const res = await platformFinanceService.fetchLedgerTransactions(params);
      setTransactions(res.items);
    } catch (err) {
      console.error('[AdminLedgerView] Error loading ledger:', err);
      setTransactions([]);
    } finally {
      setLoadingLedger(false);
    }
  }, [storeFilter, typeFilter, dateFrom, dateTo, search]);

  // Initial load and filter change trigger
  useEffect(() => {
    loadMetrics(storeFilter);
    loadLedger();
  }, [loadMetrics, loadLedger, storeFilter, typeFilter, dateFrom, dateTo]);

  // Group raw transactions by Order / Payout / Reference
  const groupedOrders = useMemo<LedgerOrderGroup[]>(() => {
    const map = new Map<string, LedgerOrderGroup>();

    transactions.forEach((tx) => {
      // Determine unique group key: orderCode -> orderId -> referenceId -> id
      const key = tx.orderCode
        ? tx.orderCode
        : tx.orderId
        ? `ORD-${tx.orderId.substring(0, 8)}`
        : tx.referenceType === 'PAYOUT'
        ? `PAYOUT-${tx.referenceId || tx.id}`
        : tx.id;

      const groupType = tx.orderCode || tx.orderId || tx.referenceType === 'ORDER' || tx.referenceType === 'ORDER_ITEM'
        ? 'ORDER'
        : tx.referenceType === 'PAYOUT' || tx.type === 'DEBIT_AVAILABLE'
        ? 'PAYOUT'
        : tx.type === 'PENALTY_DEDUCTION'
        ? 'PENALTY'
        : 'ADJUSTMENT';

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          orderCode: tx.orderCode,
          orderId: tx.orderId,
          storeName: tx.storeName || 'Toàn Sàn',
          storeId: tx.storeId,
          latestTimestamp: tx.timestamp,
          transactionCount: 0,
          totalInflow: 0,
          totalOutflow: 0,
          netAmount: 0,
          latestBalanceAfter: tx.balanceAfter,
          primaryDirection: tx.flowDirection,
          primaryType: tx.type,
          status: 'COMPLETED',
          summaryDescription: tx.description,
          items: [],
        });
      }

      const group = map.get(key)!;
      group.items.push(tx);
      group.transactionCount += 1;

      if (tx.flowDirection === 'INFLOW') {
        group.totalInflow += tx.amount;
        group.netAmount += tx.amount;
      } else if (tx.flowDirection === 'OUTFLOW') {
        group.totalOutflow += tx.amount;
        group.netAmount -= tx.amount;
      } else {
        if (group.netAmount === 0) {
          group.netAmount = tx.amount;
        }
      }

      // Keep latest timestamp and latest balance after
      if (new Date(tx.timestamp).getTime() >= new Date(group.latestTimestamp).getTime()) {
        group.latestTimestamp = tx.timestamp;
        if (tx.balanceAfter !== undefined) {
          group.latestBalanceAfter = tx.balanceAfter;
        }
        group.primaryDirection = tx.flowDirection;
        group.primaryType = tx.type;
      }
    });

    // Return groups sorted by latest activity descending
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
    );
  }, [transactions]);

  // Toggle single order accordion
  const toggleExpandOrder = useCallback((key: string | number) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  // Refs for stable realtime event handling
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
        loadLedgerRef.current();
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
    loadLedger();
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
    loadLedger();
  };

  // Columns for the GroupedDataTable Parent Rows
  const groupColumns = useMemo<Column<LedgerOrderGroup>[]>(
    () => [
      {
        key: 'orderCode',
        title: 'Mã Đơn / Nghiệp Vụ',
        render: (_, row) => (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00875A] text-[16px]">
                {row.orderCode ? 'shopping_bag' : row.id.startsWith('PAYOUT') ? 'payments' : 'receipt_long'}
              </span>
              <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-[13px]">
                {row.orderCode ? `#${row.orderCode}` : row.id}
              </span>
            </div>
            <span className="text-gray-400 font-normal text-[11px] flex items-center gap-1 font-mono">
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              <span>{formatVietnamDateTime(row.latestTimestamp)}</span>
            </span>
          </div>
        ),
      },
      {
        key: 'storeName',
        title: 'Gian Hàng',
        render: (_, row) => (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">storefront</span>
            <span className="truncate max-w-[200px]" title={row.storeName}>
              {row.storeName}
            </span>
          </div>
        ),
      },
      {
        key: 'transactionCount',
        title: 'Số Bút Toán',
        align: 'center',
        render: (_, row) => (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              <span className="material-symbols-outlined text-[13px]">receipt</span>
              <span>{row.transactionCount} bút toán</span>
            </span>
          </div>
        ),
      },
      {
        key: 'primaryDirection',
        title: 'Chiều Dòng Tiền',
        render: (_, row) => {
          if (row.primaryDirection === 'INFLOW') {
            return (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                <span>Vào Sàn (+)</span>
              </span>
            );
          }
          if (row.primaryDirection === 'OUTFLOW') {
            return (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                <span>Ra Ngoài (-)</span>
              </span>
            );
          }
          return (
            <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600">
              <span className="material-symbols-outlined text-[14px]">sync_alt</span>
              <span>Luân Chuyển</span>
            </span>
          );
        },
      },
      {
        key: 'netAmount',
        title: 'Số Tiền Ròng (VNĐ)',
        align: 'right',
        render: (_, row) => {
          const isPositive = row.primaryDirection === 'INFLOW';
          const isNegative = row.primaryDirection === 'OUTFLOW';
          return (
            <div className="flex flex-col items-end">
              <span className={`font-mono text-[13px] font-bold ${
                isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-gray-900'
              }`}>
                {isPositive ? '+' : isNegative ? '-' : ''}
                {platformFinanceService.formatVND(Math.abs(row.netAmount))}
              </span>
            </div>
          );
        },
      },
      {
        key: 'latestBalanceAfter',
        title: 'Số Dư Sau GD',
        align: 'right',
        render: (_, row) => (
          <span className="font-mono text-[11px] text-gray-700 font-medium">
            {row.latestBalanceAfter !== undefined
              ? platformFinanceService.formatVND(row.latestBalanceAfter)
              : '-'}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'center',
        render: () => (
          <div className="flex justify-center">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Thành Công
            </span>
          </div>
        ),
      },
    ],
    []
  );

  // Render Sub-Table for child transactions inside the accordion
  const renderOrderLedgerDetail = useCallback((group: LedgerOrderGroup) => {
    return (
      <div className="flex flex-col gap-3 p-3 bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 my-2">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-[18px]">
              receipt_long
            </span>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Chi tiết các bút toán sổ cái ({group.items.length} bút toán) {group.orderCode ? `- Đơn hàng #${group.orderCode}` : ''}
            </h4>
          </div>
          <div className="text-[11px] text-gray-500 font-mono">
            Gian hàng: <strong className="text-gray-800">{group.storeName}</strong>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs divide-y divide-gray-100">
            <thead className="bg-gray-50 text-[10.5px] uppercase font-bold text-gray-500 tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Mã Bút Toán</th>
                <th className="py-2.5 px-3">Thời Gian</th>
                <th className="py-2.5 px-3">Phân Loại Dòng Tiền</th>
                <th className="py-2.5 px-3">Chiều GD</th>
                <th className="py-2.5 px-3 text-right">Số Tiền (VNĐ)</th>
                <th className="py-2.5 px-3 text-right">Số Dư Sau GD</th>
                <th className="py-2.5 px-4">Diễn Giải Kế Toán Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white font-medium">
              {group.items.map((item) => {
                const isPositive = item.flowDirection === 'INFLOW';
                const isNegative = item.flowDirection === 'OUTFLOW';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Transaction ID */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-semibold text-gray-800" title={item.id}>
                        {item.id.length > 12 ? `${item.id.substring(0, 10)}...` : item.id}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('vi-VN')}
                    </td>

                    {/* Type Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.type === 'CREDIT_PENDING'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : item.type === 'CREDIT_AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.type === 'MOVE_PENDING_TO_AVAILABLE'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : item.type === 'DEBIT_AVAILABLE'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : item.type === 'COMMISSION_EARNED'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : item.type === 'PENALTY_DEDUCTION'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {item.type}
                      </span>
                    </td>

                    {/* Flow Direction */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isPositive ? (
                        <span className="text-emerald-600 font-bold text-[11px]">↓ Vào Sàn (+)</span>
                      ) : isNegative ? (
                        <span className="text-rose-600 font-bold text-[11px]">↑ Ra Ngoài (-)</span>
                      ) : (
                        <span className="text-indigo-600 font-bold text-[11px]">⮂ Luân Chuyển</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                      isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-gray-900'
                    }`}>
                      {isPositive ? '+' : isNegative ? '-' : ''}
                      {platformFinanceService.formatVND(item.amount)}
                    </td>

                    {/* Balance After */}
                    <td className="py-2.5 px-3 text-right font-mono text-gray-600 text-[11px] whitespace-nowrap">
                      {item.balanceAfter !== undefined ? platformFinanceService.formatVND(item.balanceAfter) : '-'}
                    </td>

                    {/* Detailed Accounting Description */}
                    <td className="py-2.5 px-4 text-gray-600 text-[11px] leading-relaxed">
                      {item.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, []);

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
                Grouped Data Model
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {lastLiveEvent ? (
                <span className="text-amber-300 font-medium">⚡ Sự kiện mới: {lastLiveEvent}</span>
              ) : (
                'Dữ liệu được gom nhóm tự động theo từng Đơn Hàng & Nghiệp Vụ. Nhấn vào mũi tên để xem chi tiết.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              loadMetrics(storeFilter);
              loadLedger();
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

      {/* 4. GROUPED DATA TABLE WITH EXPANDABLE ARROWS */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-[20px]">account_tree</span>
            <h3 className="text-sm font-bold text-gray-900">
              Sổ Cái Gom Nhóm Theo Đơn Hàng &amp; Nghiệp Vụ ({groupedOrders.length} nhóm)
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {transactions.length > 0
              ? `Tổng cộng ${transactions.length.toLocaleString('vi-VN')} bút toán dòng tiền`
              : '0 bút toán'}
          </span>
        </div>

        <GroupedDataTable
          columns={groupColumns}
          data={groupedOrders}
          keyField="id"
          expandable={true}
          expandedRowRender={renderOrderLedgerDetail}
          expandedRowKeys={expandedKeys}
          onExpandedRowsChange={setExpandedKeys}
          onRowClick={(row) => toggleExpandOrder(row.id)}
          loading={loadingLedger}
          emptyTitle="Chưa Có Giao Dịch Dòng Tiền Trong Kỳ"
          emptyMessage="Hệ thống chưa ghi nhận biến động số dư hoặc giao dịch nào phù hợp với bộ lọc hiện tại. Khi phát sinh đơn hàng, ký quỹ hoặc rút tiền, các bút toán sẽ tự động hiển thị thời gian thực."
          emptyIcon="account_balance_wallet"
          pagination={true}
          className="w-full"
        />
      </div>
    </div>
  );
}

export default AdminLedgerView;
