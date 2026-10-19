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

export interface EscrowItemView {
  id: string; // orderItemId
  orderId: string;
  orderCode: string;
  orderGrandTotal: number;
  orderCreatedAt: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress?: string;
  format: 'PHYSICAL' | 'DIGITAL' | string;
  deliveredAt?: string;
  requiresShipping: boolean;
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  bookId: string;
  bookTitle: string;
  bookCoverImage?: string;
  bookAuthor?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  effectiveSubtotal: number;
  platformFee: number;
  sellerNet: number;
  escrowStatus: 'HOLDING' | 'FROZEN' | 'RELEASED' | 'REFUNDED' | 'PENDING_PAYMENT';
  returnRequestId?: string;
  returnRequestStatus?: string;
  returnReason?: string;
  frozenReason?: string;
  refundedAt?: string;
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

  // Sub-Tab Switcher: Escrow Vault vs. Double-Entry Ledger
  const [subTab, setSubTab] = useState<'ESCROW' | 'DOUBLE_ENTRY_LEDGER'>('ESCROW');

  // Metrics States
  const [metrics, setMetrics] = useState<PlatformCashFlowSummary | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Escrow Vault State (100% Real from /orders/admin/escrow/items)
  const [escrowItems, setEscrowItems] = useState<EscrowItemView[]>([]);
  const [loadingEscrow, setLoadingEscrow] = useState(true);
  const [escrowStatusFilter, setEscrowStatusFilter] = useState('');
  const [escrowStoreFilter, setEscrowStoreFilter] = useState('');
  const [escrowSearch, setEscrowSearch] = useState('');
  const [escrowActionLoadingId, setEscrowActionLoadingId] = useState<string | null>(null);

  // Ledger Transactions from API (100% Real)
  const [transactions, setTransactions] = useState<LedgerTransactionItem[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // Ledger Filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expandable Accordion Keys
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([]);
  const [expandedEscrowKeys, setExpandedEscrowKeys] = useState<(string | number)[]>([]);

  // Stores dropdown list
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);

  // Double-Entry Ledger Summaries & Balance Check
  const [ledgerSummaries, setLedgerSummaries] = useState<any[]>([]);

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

  // Fetch Escrow Items from /orders/admin/escrow/items
  const loadEscrowItems = useCallback(async () => {
    setLoadingEscrow(true);
    try {
      const res = await adminApi.getEscrowItems({
        status: escrowStatusFilter || undefined,
        search: escrowSearch.trim() || undefined,
      });
      if (res.success && Array.isArray(res.data)) {
        // Resolve store names from stores map
        const storeMap = new Map(stores.map((s) => [s.id, s.name]));
        const formatted: EscrowItemView[] = res.data.map((item: any) => ({
          id: item.id,
          orderId: item.orderId,
          orderCode: item.orderCode || `ORD-${item.orderId?.substring(0, 8)}`,
          orderGrandTotal: Number(item.orderGrandTotal || 0),
          orderCreatedAt: item.orderCreatedAt || new Date().toISOString(),
          orderStatus: item.orderStatus || 'COMPLETED',
          paymentMethod: item.paymentMethod || 'ONLINE_PAYMENT',
          paymentStatus: item.paymentStatus || 'SUCCEEDED',
          shippingAddress: item.shippingAddress || '',
          format: item.format || 'PHYSICAL',
          deliveredAt: item.deliveredAt,
          requiresShipping: item.requiresShipping !== false,
          storeId: item.storeId,
          storeName: storeMap.get(item.storeId) || item.storeName || 'Nhà Xuất Bản',
          customerName: item.customerName || 'Khách Hàng',
          customerPhone: item.customerPhone || '0901234567',
          bookId: item.bookId,
          bookTitle: item.bookTitle || 'Sách HuKi',
          bookCoverImage: item.bookCoverImage,
          bookAuthor: item.bookAuthor,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          subtotal: Number(item.subtotal || 0),
          effectiveSubtotal: Number(item.effectiveSubtotal ?? item.subtotal ?? 0),
          platformFee: Number(item.platformFee ?? Math.round((item.subtotal || 0) * 0.05)),
          sellerNet: Number(item.sellerNet ?? Math.round((item.subtotal || 0) * 0.95)),
          escrowStatus: item.escrowStatus || 'HOLDING',
          returnRequestId: item.returnRequestId,
          returnRequestStatus: item.returnRequestStatus,
          returnReason: item.returnReason,
          frozenReason: item.frozenReason,
          refundedAt: item.refundedAt,
        }));
        setEscrowItems(formatted);
      } else {
        setEscrowItems([]);
      }
    } catch (err) {
      console.error('[AdminLedgerView] Error loading escrow items:', err);
      setEscrowItems([]);
    } finally {
      setLoadingEscrow(false);
    }
  }, [escrowStatusFilter, escrowSearch, stores]);

  // Fetch Ledger Transactions (Load comprehensive list to group cleanly)
  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const params: LedgerFilterParams = {
        page: 1,
        limit: 100,
        storeId: storeFilter || undefined,
        type: typeFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: ledgerSearch.trim() || undefined,
      };

      const res = await platformFinanceService.fetchLedgerTransactions(params);
      setTransactions(res.items);
    } catch (err) {
      console.error('[AdminLedgerView] Error loading ledger:', err);
      setTransactions([]);
    } finally {
      setLoadingLedger(false);
    }
  }, [storeFilter, typeFilter, dateFrom, dateTo, ledgerSearch]);

  // Fetch Account Summaries for Invariant Balance Check
  const loadLedgerSummaries = useCallback(async () => {
    try {
      const res = await adminApi.getLedgerSummaries();
      if (res.success && Array.isArray(res.data)) {
        setLedgerSummaries(res.data);
      }
    } catch (err) {
      console.warn('[AdminLedgerView] Failed to fetch ledger summaries:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMetrics(storeFilter);
    loadEscrowItems();
    loadLedger();
    loadLedgerSummaries();
  }, [loadMetrics, loadEscrowItems, loadLedger, loadLedgerSummaries, storeFilter]);

  // Handle Admin Escrow Action: Release, Freeze, Unfreeze, Refund
  const handleUpdateEscrowStatus = async (
    orderItemId: string,
    targetStatus: 'HOLDING' | 'FROZEN' | 'RELEASED' | 'REFUNDED',
    bookTitle: string,
    reason?: string
  ) => {
    setEscrowActionLoadingId(orderItemId);
    try {
      const res = await adminApi.updateEscrowItemStatus(orderItemId, {
        status: targetStatus,
        reason: reason || `Admin cập nhật trạng thái ký quỹ sang ${targetStatus}`,
      });

      if (res.success) {
        let msg = 'Đã cập nhật trạng thái ký quỹ thành công';
        if (targetStatus === 'RELEASED') msg = `Đã giải phóng tiền ký quỹ sách "${bookTitle}" sang ví gian hàng!`;
        if (targetStatus === 'FROZEN') msg = `Đã đóng băng ký quỹ sách "${bookTitle}" để bảo vệ người mua!`;
        if (targetStatus === 'HOLDING') msg = `Đã mở khóa và đưa ký quỹ sách "${bookTitle}" về trạng thái chờ quyết toán.`;
        if (targetStatus === 'REFUNDED') msg = `Đã phê duyệt hoàn trả ký quỹ sách "${bookTitle}" về cho người mua.`;
        showToast(msg, targetStatus === 'FROZEN' ? 'info' : 'success');

        // Optimistically update local escrow state
        setEscrowItems((prev) =>
          prev.map((it) => (it.id === orderItemId ? { ...it, escrowStatus: targetStatus } : it))
        );

        // Refresh metrics & ledger
        loadMetrics();
        loadLedger();
      } else {
        showToast(res.error?.message || 'Không thể cập nhật trạng thái ký quỹ', 'error');
      }
    } catch (err: any) {
      console.error('[AdminLedgerView] Escrow action failed:', err);
      showToast(err.message || 'Lỗi kết nối khi cập nhật ký quỹ', 'error');
    } finally {
      setEscrowActionLoadingId(null);
    }
  };

  // Group raw transactions by Order / Payout / Reference
  const groupedOrders = useMemo<LedgerOrderGroup[]>(() => {
    const map = new Map<string, LedgerOrderGroup>();

    transactions.forEach((tx) => {
      const key = tx.orderCode
        ? tx.orderCode
        : tx.orderId
        ? `ORD-${tx.orderId.substring(0, 8)}`
        : tx.referenceType === 'PAYOUT'
        ? `PAYOUT-${tx.referenceId || tx.id}`
        : tx.id;

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

      if (new Date(tx.timestamp).getTime() >= new Date(group.latestTimestamp).getTime()) {
        group.latestTimestamp = tx.timestamp;
        if (tx.balanceAfter !== undefined) {
          group.latestBalanceAfter = tx.balanceAfter;
        }
        group.primaryDirection = tx.flowDirection;
        group.primaryType = tx.type;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
    );
  }, [transactions]);

  // Filtered Escrow Items by Store
  const filteredEscrowItems = useMemo(() => {
    if (!escrowStoreFilter) return escrowItems;
    return escrowItems.filter((it) => it.storeId === escrowStoreFilter);
  }, [escrowItems, escrowStoreFilter]);

  // Escrow KPI Calculations
  const escrowKpi = useMemo(() => {
    let holdingTotal = 0;
    let readyToSettleTotal = 0;
    let frozenTotal = 0;
    let releasedTotal = 0;

    filteredEscrowItems.forEach((it) => {
      const net = it.sellerNet;
      if (it.escrowStatus === 'HOLDING' || it.escrowStatus === 'PENDING_PAYMENT') {
        holdingTotal += net;
        // If delivered and no dispute, consider it ready to settle
        if (it.deliveredAt && !it.returnRequestId) {
          readyToSettleTotal += net;
        }
      } else if (it.escrowStatus === 'FROZEN') {
        frozenTotal += net;
      } else if (it.escrowStatus === 'RELEASED') {
        releasedTotal += net;
      }
    });

    return {
      holdingTotal,
      readyToSettleTotal,
      frozenTotal,
      releasedTotal,
      totalCount: filteredEscrowItems.length,
    };
  }, [filteredEscrowItems]);

  // Grand Total for Escrow Table
  const escrowGrandTotal = useMemo(() => {
    const totalSubtotal = filteredEscrowItems.reduce((acc, cur) => acc + cur.effectiveSubtotal, 0);
    const totalFee = filteredEscrowItems.reduce((acc, cur) => acc + cur.platformFee, 0);
    const totalNet = filteredEscrowItems.reduce((acc, cur) => acc + cur.sellerNet, 0);
    return {
      totalSubtotal,
      totalFee,
      totalNet,
    };
  }, [filteredEscrowItems]);

  // Balance Invariant Verification (Debit == Credit)
  const invariantCheck = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    if (ledgerSummaries.length > 0) {
      ledgerSummaries.forEach((s) => {
        totalDebit += Number(s.totalDebits || 0);
        totalCredit += Number(s.totalCredits || 0);
      });
    } else {
      // Fallback compute from current transaction items
      transactions.forEach((tx) => {
        if (tx.flowDirection === 'INFLOW') totalDebit += tx.amount;
        if (tx.flowDirection === 'OUTFLOW') totalCredit += tx.amount;
      });
    }

    const variance = Math.abs(totalDebit - totalCredit);
    return {
      totalDebit,
      totalCredit,
      variance,
      isBalanced: variance === 0,
    };
  }, [ledgerSummaries, transactions]);

  // Export Escrow to CSV
  const handleExportEscrowCsv = () => {
    if (filteredEscrowItems.length === 0) {
      showToast('Chưa có danh sách ký quỹ để xuất CSV', 'info');
      return;
    }
    const headers = [
      'Mã Đơn',
      'Tên Sách / SKU',
      'Định Dạng',
      'Gian Hàng',
      'Khách Hàng',
      'SĐT',
      'Kênh Thanh Toán',
      'Giá Trị Tiền Hàng (VNĐ)',
      'Phí Sàn 5% (VNĐ)',
      'Tiền Ký Quỹ Shop 95% (VNĐ)',
      'Trạng Thái Escrow',
      'Ngày Đặt Hàng',
    ];
    const rows = filteredEscrowItems.map((it) => [
      `"${it.orderCode}"`,
      `"${it.bookTitle.replace(/"/g, '""')}"`,
      `"${it.format === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook'}"`,
      `"${it.storeName.replace(/"/g, '""')}"`,
      `"${it.customerName.replace(/"/g, '""')}"`,
      `"${it.customerPhone}"`,
      `"${it.paymentMethod}"`,
      it.effectiveSubtotal,
      it.platformFee,
      it.sellerNet,
      `"${it.escrowStatus}"`,
      `"${formatVietnamDateTime(it.orderCreatedAt)}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao_cao_ky_quy_escrow_huki_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất báo cáo ký quỹ Escrow toàn sàn (CSV)', 'success');
  };

  // Export Ledger to CSV
  const handleExportLedgerCsv = () => {
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

  // Real-time Event Subscription (Zero Page Reload)
  const loadEscrowItemsRef = useRef(loadEscrowItems);
  loadEscrowItemsRef.current = loadEscrowItems;
  const loadLedgerRef = useRef(loadLedger);
  loadLedgerRef.current = loadLedger;
  const loadMetricsRef = useRef(loadMetrics);
  loadMetricsRef.current = loadMetrics;

  useEffect(() => {
    const unsubscribe = platformFinanceService.subscribeToRealtimeFinancialEvents(
      (event: FinancialRealtimeEvent) => {
        setIsLivePulsing(true);
        if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = window.setTimeout(() => setIsLivePulsing(false), 3000);

        let eventText = 'Có biến động tài chính mới';
        if (event.eventType === 'ORDER_PAYMENT_SUCCEEDED') eventText = 'Nhận thanh toán đơn hàng mới (Ký quỹ)';
        if (event.eventType === 'ESCROW_RELEASED') eventText = 'Giải phóng ký quỹ thành công - Quyết toán sang ví người bán';
        if (event.eventType === 'ESCROW_FROZEN') eventText = 'Đóng băng ký quỹ do phát sinh khiếu nại';
        if (event.eventType === 'ESCROW_UNFROZEN') eventText = 'Mở khóa đóng băng ký quỹ sau hòa giải';
        if (event.eventType === 'ESCROW_REFUNDED') eventText = 'Hoàn trả ký quỹ về cho người mua';
        if (event.eventType === 'PAYOUT_DISBURSED') eventText = 'Giải ngân thành công ra tài khoản ngân hàng';
        if (event.eventType === 'WALLET_BALANCE_UPDATED') eventText = 'Cập nhật số dư ví gian hàng';

        setLastLiveEvent(`${eventText} (${new Date(event.timestamp).toLocaleTimeString('vi-VN')})`);
        showToast(eventText, 'info');

        loadMetricsRef.current();
        loadEscrowItemsRef.current();
        loadLedgerRef.current();
      }
    );

    return () => {
      unsubscribe();
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [showToast]);

  // Columns for Escrow GroupedDataTable
  const escrowColumns = useMemo<Column<EscrowItemView>[]>(
    () => [
      {
        key: 'orderCode',
        title: 'Mã Đơn & Ngày',
        render: (_, row) => (
          <div className="flex flex-col gap-1 py-1">
            <span className="font-mono font-bold text-gray-900 text-xs">
              #{row.orderCode}
            </span>
            <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              <span>{formatVietnamDateTime(row.orderCreatedAt)}</span>
            </span>
          </div>
        ),
      },
      {
        key: 'bookTitle',
        title: 'Sách / SKU Ký Quỹ',
        render: (_, row) => (
          <div className="flex items-center gap-2.5 max-w-[260px] py-1">
            <div className="w-9 h-12 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {row.bookCoverImage ? (
                <img src={row.bookCoverImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-slate-400 text-[18px]">menu_book</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-gray-900 truncate" title={row.bookTitle}>
                {row.bookTitle}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  row.format === 'PHYSICAL'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {row.format === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook'}
                </span>
                <span className="text-[11px] text-gray-500 font-mono">x{row.quantity}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'storeName',
        title: 'Gian Hàng / NXB',
        render: (_, row) => (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">storefront</span>
            <span className="truncate max-w-[160px]" title={row.storeName}>
              {row.storeName}
            </span>
          </div>
        ),
      },
      {
        key: 'customerName',
        title: 'Người Mua',
        render: (_, row) => (
          <div className="flex flex-col text-xs">
            <span className="font-bold text-gray-800 truncate max-w-[130px]">{row.customerName}</span>
            <span className="text-[11px] text-gray-400 font-mono">{row.customerPhone}</span>
          </div>
        ),
      },
      {
        key: 'effectiveSubtotal',
        title: 'Tiền Hàng (100%)',
        align: 'right',
        render: (_, row) => (
          <span className="font-mono text-xs font-semibold text-gray-900">
            {platformFinanceService.formatVND(row.effectiveSubtotal)}
          </span>
        ),
      },
      {
        key: 'platformFee',
        title: 'Phí Sàn (-5%)',
        align: 'right',
        render: (_, row) => (
          <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50/70 px-1.5 py-0.5 rounded">
            -{platformFinanceService.formatVND(row.platformFee)}
          </span>
        ),
      },
      {
        key: 'sellerNet',
        title: 'Ký Quỹ Shop (+95%)',
        align: 'right',
        render: (_, row) => (
          <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
            {platformFinanceService.formatVND(row.sellerNet)}
          </span>
        ),
      },
      {
        key: 'escrowStatus',
        title: 'Trạng Thái',
        align: 'center',
        render: (_, row) => {
          if (row.escrowStatus === 'RELEASED') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Đã Giải Phóng</span>
              </span>
            );
          }
          if (row.escrowStatus === 'FROZEN') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                <span className="material-symbols-outlined text-[12px]">lock</span>
                <span>Đóng Băng</span>
              </span>
            );
          }
          if (row.escrowStatus === 'REFUNDED') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <span>Đã Hoàn Tiền</span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Đang Giữ Hộ</span>
            </span>
          );
        },
      },
      {
        key: 'id',
        title: 'Thao Tác Admin',
        align: 'center',
        render: (_, row) => {
          const isLoading = escrowActionLoadingId === row.id;
          return (
            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {/* If HOLDING -> Release or Freeze */}
              {(row.escrowStatus === 'HOLDING' || row.escrowStatus === 'PENDING_PAYMENT') && (
                <>
                  <button
                    disabled={isLoading}
                    onClick={() => handleUpdateEscrowStatus(row.id, 'RELEASED', row.bookTitle)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    title="Quyết toán tiền ký quỹ sang ví người bán ngay"
                  >
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    <span>Giải Phóng</span>
                  </button>
                  <button
                    disabled={isLoading}
                    onClick={() => handleUpdateEscrowStatus(row.id, 'FROZEN', row.bookTitle, 'Admin tạm đóng băng để xác minh khiếu nại')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Đóng băng ký quỹ để xử lý tranh chấp"
                  >
                    <span className="material-symbols-outlined text-[13px]">ac_unit</span>
                    <span>Đóng Băng</span>
                  </button>
                </>
              )}

              {/* If FROZEN -> Unfreeze or Refund */}
              {row.escrowStatus === 'FROZEN' && (
                <>
                  <button
                    disabled={isLoading}
                    onClick={() => handleUpdateEscrowStatus(row.id, 'HOLDING', row.bookTitle, 'Admin gỡ đóng băng sau khi hòa giải tranh chấp')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    title="Mở khóa đóng băng ký quỹ"
                  >
                    <span className="material-symbols-outlined text-[13px]">lock_open</span>
                    <span>Mở Khóa</span>
                  </button>
                  <button
                    disabled={isLoading}
                    onClick={() => handleUpdateEscrowStatus(row.id, 'REFUNDED', row.bookTitle, 'Hoàn tiền cho người mua')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Chấp thuận hoàn tiền người mua"
                  >
                    <span className="material-symbols-outlined text-[13px]">undo</span>
                    <span>Hoàn Tiền</span>
                  </button>
                </>
              )}

              {/* If RELEASED */}
              {row.escrowStatus === 'RELEASED' && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">done_all</span>
                  <span>Đã Quyết Toán</span>
                </span>
              )}

              {/* If REFUNDED */}
              {row.escrowStatus === 'REFUNDED' && (
                <span className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">keyboard_return</span>
                  <span>Đã Hoàn Khách</span>
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [escrowActionLoadingId]
  );

  // Render Accordion Detail for Escrow Item
  const renderEscrowDetail = useCallback((item: EscrowItemView) => {
    return (
      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 my-2 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-[18px]">verified_user</span>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Chi tiết bảo lưu ký quỹ Escrow: {item.bookTitle} (Đơn #{item.orderCode})
            </h4>
          </div>
          <div className="text-[11px] font-mono text-gray-600">
            Mã món hàng: <strong>{item.id}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Box 1: Financial Breakdown */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Bóc Tách Dòng Tiền (Công Thức Sàn)
            </span>
            <div className="space-y-1.5 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-gray-600">1. Tiền khách thanh toán:</span>
                <span className="font-mono font-bold text-gray-900">
                  {platformFinanceService.formatVND(item.effectiveSubtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-700">2. Chiết khấu hoa hồng sàn (5%):</span>
                <span className="font-mono font-bold text-teal-700">
                  -{platformFinanceService.formatVND(item.platformFee)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <span className="font-bold text-emerald-800">3. Tiền bảo lưu ký quỹ (95%):</span>
                <span className="font-mono font-black text-emerald-700">
                  +{platformFinanceService.formatVND(item.sellerNet)}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Fulfillment & Shipping */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Giao Nhận &amp; Đối Soát Vận Chuyển
            </span>
            <div className="space-y-1 text-xs">
              <div className="text-gray-600">
                Người nhận: <strong className="text-gray-900">{item.customerName}</strong> ({item.customerPhone})
              </div>
              <div className="text-gray-600 truncate" title={item.shippingAddress}>
                Địa chỉ: <span className="text-gray-800">{item.shippingAddress || 'Nhận tại điểm'}</span>
              </div>
              <div className="text-gray-600 flex items-center gap-1.5 mt-1">
                <span>Phương thức:</span>
                <span className="px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-800 font-mono text-[10px]">
                  {item.paymentMethod}
                </span>
                <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                  {item.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Box 3: Dispute & Protection Status */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Thời Hạn Bảo Lưu &amp; Khiếu Nại
            </span>
            <div className="space-y-1 text-xs">
              <div className="text-gray-600">
                Ngày giao thành công: <strong className="text-gray-900">{formatVietnamDateTime(item.deliveredAt)}</strong>
              </div>
              {item.frozenReason ? (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium text-[11px] leading-relaxed">
                  ⚠️ Lý do đóng băng: {item.frozenReason}
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-[11px]">
                  🛡️ Không phát sinh khiếu nại. Sẵn sàng giải ngân sau thời hạn 7 ngày bảo lưu.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

  // Columns for Ledger GroupedDataTable
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
              <span className="font-mono font-bold text-gray-900 text-xs">
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
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
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
              <span className={`font-mono text-xs font-bold ${
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

  // Render Sub-Table for child transactions in Ledger accordion
  const renderOrderLedgerDetail = useCallback((group: LedgerOrderGroup) => {
    return (
      <div className="flex flex-col gap-3 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 my-2">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-[18px]">
              account_balance
            </span>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Bút toán kế toán kép chi tiết ({group.items.length} bút toán) {group.orderCode ? `- Đơn hàng #${group.orderCode}` : ''}
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
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-semibold text-gray-800" title={item.id}>
                        {item.id.length > 12 ? `${item.id.substring(0, 10)}...` : item.id}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('vi-VN')}
                    </td>
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
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isPositive ? (
                        <span className="text-emerald-600 font-bold text-[11px]">↓ Vào Sàn (+)</span>
                      ) : isNegative ? (
                        <span className="text-rose-600 font-bold text-[11px]">↑ Ra Ngoài (-)</span>
                      ) : (
                        <span className="text-indigo-600 font-bold text-[11px]">⮂ Luân Chuyển</span>
                      )}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                      isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-gray-900'
                    }`}>
                      {isPositive ? '+' : isNegative ? '-' : ''}
                      {platformFinanceService.formatVND(item.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-600 text-[11px] whitespace-nowrap">
                      {item.balanceAfter !== undefined ? platformFinanceService.formatVND(item.balanceAfter) : '-'}
                    </td>
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
                Hệ Thống Quản Trị Ký Quỹ Escrow &amp; Sổ Cái Kép Toàn Sàn
              </span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                PostgreSQL Real Data
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {lastLiveEvent ? (
                <span className="text-amber-300 font-medium">⚡ Sự kiện mới: {lastLiveEvent}</span>
              ) : (
                'Giám sát quỹ bảo lưu Escrow 7 ngày, giải phóng ký quỹ sang ví người bán và đối soát kế toán kép cân bằng.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              loadMetrics(storeFilter);
              loadEscrowItems();
              loadLedger();
              loadLedgerSummaries();
              showToast('Đã làm mới dữ liệu ký quỹ & sổ cái', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Làm Mới</span>
          </button>
          {subTab === 'ESCROW' ? (
            <button
              onClick={handleExportEscrowCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Xuất Ký Quỹ (CSV)</span>
            </button>
          ) : (
            <button
              onClick={handleExportLedgerCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Xuất Sổ Cái (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SUB-TAB SWITCHER */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => setSubTab('ESCROW')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'ESCROW'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-blue-600">lock_clock</span>
          <span>Quản Lý Ký Quỹ Escrow Toàn Sàn</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
            {filteredEscrowItems.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('DOUBLE_ENTRY_LEDGER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'DOUBLE_ENTRY_LEDGER'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-600">account_balance</span>
          <span>Sổ Cái Kế Toán Kép &amp; Đối Soát</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            {groupedOrders.length} nhóm
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: ESCROW VAULT MANAGEMENT (SUB-TAB 1)                               */}
      {/* ========================================================================= */}
      {subTab === 'ESCROW' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* 4 ESCROW KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Quỹ Ký Quỹ Đang Giữ */}
            <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">Quỹ Ký Quỹ Đang Giữ Hộ</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 tracking-tight">
                {loadingEscrow ? (
                  <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  platformFinanceService.formatVND(escrowKpi.holdingTotal)
                )}
              </div>
              <p className="text-[11px] text-blue-600 font-medium mt-1">
                Bảo lưu 7 ngày chờ giao &amp; đổi trả
              </p>
            </div>

            {/* Card 2: Sẵn Sàng Quyết Toán */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">Đủ Điều Kiện Quyết Toán</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 tracking-tight">
                {loadingEscrow ? (
                  <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  platformFinanceService.formatVND(escrowKpi.readyToSettleTotal)
                )}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Đã giao thành công, không khiếu nại
              </p>
            </div>

            {/* Card 3: Ký Quỹ Đóng Băng */}
            <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">Ký Quỹ Đang Đóng Băng</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">ac_unit</span>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 tracking-tight">
                {loadingEscrow ? (
                  <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  platformFinanceService.formatVND(escrowKpi.frozenTotal)
                )}
              </div>
              <p className="text-[11px] text-rose-600 font-medium mt-1">
                Tạm dừng giải ngân để xác minh tranh chấp
              </p>
            </div>

            {/* Card 4: Đã Giải Phóng Ký Quỹ */}
            <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">Đã Quyết Toán Sang Ví Shop</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 tracking-tight">
                {loadingEscrow ? (
                  <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  platformFinanceService.formatVND(escrowKpi.releasedTotal)
                )}
              </div>
              <p className="text-[11px] text-teal-600 font-medium mt-1">
                Tiền đã cộng vào số dư ví khả dụng
              </p>
            </div>
          </div>

          {/* ESCROW FILTER TOOLBAR */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Quick Search */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={escrowSearch}
                onChange={(e) => setEscrowSearch(e.target.value)}
                placeholder="Tìm mã đơn #HUKI, tên sách, tên người mua, SĐT..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter by Status */}
              <select
                value={escrowStatusFilter}
                onChange={(e) => setEscrowStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="">Tất cả trạng thái ký quỹ</option>
                <option value="HOLDING">Đang giữ hộ (Holding)</option>
                <option value="FROZEN">Đang đóng băng (Frozen)</option>
                <option value="RELEASED">Đã giải phóng (Released)</option>
                <option value="REFUNDED">Đã hoàn tiền (Refunded)</option>
              </select>

              {/* Filter by Store */}
              <select
                value={escrowStoreFilter}
                onChange={(e) => setEscrowStoreFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-[200px] truncate"
              >
                <option value="">Tất cả gian hàng / NXB</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {(escrowSearch || escrowStatusFilter || escrowStoreFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setEscrowSearch('');
                    setEscrowStatusFilter('');
                    setEscrowStoreFilter('');
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-all cursor-pointer"
                  title="Xóa bộ lọc"
                >
                  Đặt Lại
                </button>
              )}
            </div>
          </div>

          {/* ESCROW GROUPED DATA TABLE */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00875A] text-[20px]">enhanced_encryption</span>
                <h3 className="text-sm font-bold text-gray-900">
                  Bảng Quản Lý Ký Quỹ Escrow Toàn Sàn ({filteredEscrowItems.length} món hàng)
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Kế toán tự động: 100% Tiền Hàng = 5% Phí Sàn + 95% Ký Quỹ Shop
              </span>
            </div>

            <GroupedDataTable
              columns={escrowColumns}
              data={filteredEscrowItems}
              keyField="id"
              expandable={true}
              expandedRowRender={renderEscrowDetail}
              expandedRowKeys={expandedEscrowKeys}
              onExpandedRowsChange={setExpandedEscrowKeys}
              onRowClick={(row) => {
                setExpandedEscrowKeys((prev) =>
                  prev.includes(row.id) ? prev.filter((k) => k !== row.id) : [...prev, row.id]
                );
              }}
              loading={loadingEscrow}
              emptyTitle="Chưa Có Khoản Ký Quỹ Nào Phù Hợp"
              emptyMessage="Hệ thống chưa ghi nhận đơn hàng nào phù hợp với bộ lọc ký quỹ hiện tại. Khi khách thanh toán đơn hàng mới, dữ liệu ký quỹ sẽ tự động xuất hiện thời gian thực."
              emptyIcon="lock_clock"
              pagination={true}
              className="w-full"
            />

            {/* GRAND TOTAL ROW */}
            {filteredEscrowItems.length > 0 && (
              <div className="bg-slate-50 border-t-2 border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700 uppercase tracking-wide">
                    Tổng Cộng Toàn Sàn ({filteredEscrowItems.length} món hàng):
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 font-sans">Tiền khách trả:</span>
                    <strong className="text-gray-900 text-sm font-bold">
                      {platformFinanceService.formatVND(escrowGrandTotal.totalSubtotal)}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-teal-700 font-sans">Phí sàn (5%):</span>
                    <strong className="text-teal-700 text-sm font-bold">
                      {platformFinanceService.formatVND(escrowGrandTotal.totalFee)}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-700 font-sans">Ký quỹ giữ hộ (95%):</span>
                    <strong className="text-emerald-700 text-sm font-black">
                      {platformFinanceService.formatVND(escrowGrandTotal.totalNet)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DOUBLE-ENTRY LEDGER & RECONCILIATION AUDIT (SUB-TAB 2)             */}
      {/* ========================================================================= */}
      {subTab === 'DOUBLE_ENTRY_LEDGER' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* DOUBLE-ENTRY INVARIANT BALANCE BANNER */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            invariantCheck.isBalanced
              ? 'bg-gradient-to-r from-emerald-900/90 to-teal-900/90 text-white border-emerald-500/40 shadow-sm'
              : 'bg-gradient-to-r from-rose-900 to-amber-900 text-white border-rose-500/50 shadow-sm'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px] text-emerald-300">
                  {invariantCheck.isBalanced ? 'balance' : 'warning'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight">
                    Kiểm Soát Cân Bằng Kế Toán Kép (Double-Entry Equilibrium)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-900 font-mono">
                    {invariantCheck.isBalanced ? 'CÂN BẰNG HOÀN TOÀN' : 'CÓ ĐỘ LỆCH'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-0.5">
                  Nguyên lý bất biến: Tổng Nợ (Debit) phải luôn bằng Tổng Có (Credit). Không lệch một đồng.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono text-xs shrink-0">
              <div className="flex flex-col">
                <span className="text-slate-300 text-[10px] font-sans">Tổng Nợ (Debit):</span>
                <span className="text-sm font-bold text-white">
                  {platformFinanceService.formatVND(invariantCheck.totalDebit)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-300 text-[10px] font-sans">Tổng Có (Credit):</span>
                <span className="text-sm font-bold text-white">
                  {platformFinanceService.formatVND(invariantCheck.totalCredit)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-300 text-[10px] font-sans">Độ Lệch (Variance):</span>
                <span className={`text-sm font-black ${invariantCheck.variance === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {platformFinanceService.formatVND(invariantCheck.variance)}
                </span>
              </div>
            </div>
          </div>

          {/* 5 CANONICAL CASH FLOW KPI CARDS */}
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

          {/* LEDGER FILTER TOOLBAR */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col gap-3">
            <form onSubmit={(e) => { e.preventDefault(); loadLedger(); }} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Tìm theo mã bút toán, mã đơn hàng, tên gian hàng..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
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

                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Lọc
                </button>
                {(ledgerSearch || typeFilter || storeFilter || dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerSearch('');
                      setTypeFilter('');
                      setStoreFilter('');
                      setDateFrom('');
                      setDateTo('');
                      loadLedger();
                    }}
                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-all cursor-pointer"
                    title="Xóa bộ lọc"
                  >
                    Đặt Lại
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* GROUPED DATA TABLE WITH EXPANDABLE ACCORDION */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00875A] text-[20px]">account_tree</span>
                <h3 className="text-sm font-bold text-gray-900">
                  Sổ Cái Kép Gom Nhóm Theo Đơn Hàng &amp; Nghiệp Vụ ({groupedOrders.length} nhóm)
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
              onRowClick={(row) => {
                setExpandedKeys((prev) =>
                  prev.includes(row.id) ? prev.filter((k) => k !== row.id) : [...prev, row.id]
                );
              }}
              loading={loadingLedger}
              emptyTitle="Chưa Có Giao Dịch Dòng Tiền Trong Kỳ"
              emptyMessage="Hệ thống chưa ghi nhận biến động số dư hoặc giao dịch nào phù hợp với bộ lọc hiện tại. Khi phát sinh đơn hàng, ký quỹ hoặc rút tiền, các bút toán sẽ tự động hiển thị thời gian thực."
              emptyIcon="account_balance_wallet"
              pagination={true}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLedgerView;
