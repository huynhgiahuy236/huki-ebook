"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { walletApi, type WalletTransactionItem } from '@/ui/api/walletApi';

function formatVND(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return '0đ';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '0đ';
  return `${Math.round(num).toLocaleString('vi-VN')}đ`;
}

function formatVietnamDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');

    return `${day}/${month}/${year} ${hour}:${minute}`;
  } catch {
    return dateStr;
  }
}

function getTransactionTypeDetails(type: string): {
  label: string;
  badgeClass: string;
  isPositive: boolean;
  icon: string;
} {
  switch (type) {
    case 'CREDIT_AVAILABLE':
      return {
        label: 'Cộng tiền doanh thu bán hàng',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        isPositive: true,
        icon: 'add_circle',
      };
    case 'DEBIT_AVAILABLE':
      return {
        label: 'Khấu trừ rút tiền về ngân hàng',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        isPositive: false,
        icon: 'remove_circle',
      };
    case 'MOVE_PENDING_TO_AVAILABLE':
      return {
        label: 'Giải ngân tiền tạm giữ vào ví',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        isPositive: true,
        icon: 'check_circle',
      };
    case 'MOVE_AVAILABLE_TO_FROZEN':
      return {
        label: 'Đóng băng số dư do khiếu nại',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        isPositive: false,
        icon: 'lock',
      };
    case 'MOVE_FROZEN_TO_AVAILABLE':
      return {
        label: 'Giải phóng số dư sau xử lý khiếu nại',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        isPositive: true,
        icon: 'lock_open',
      };
    default:
      return {
        label: type,
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        isPositive: true,
        icon: 'receipt',
      };
  }
}

export default function SellerTransactionsPage() {
  const { user, activeBusinessId, isLoading: isAuthLoading } = useAuth();
  const storeId = user?.business?.id || activeBusinessId || (user as any)?.storeId || null;

  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail modal
  const [selectedTx, setSelectedTx] = useState<WalletTransactionItem | null>(null);
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTxIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchTransactions = useCallback(async () => {
    if (!storeId) {
      if (!isAuthLoading) setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await walletApi.getStoreWalletTransactions(storeId, { page: 1, limit: 100 });
      if (res.success && res.data) {
        setTransactions(res.data.items || []);
      }
    } catch (err) {
      console.warn('Lỗi tải nhật ký giao dịch:', err);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, isAuthLoading]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType === 'CREDIT' && tx.type !== 'CREDIT_AVAILABLE' && tx.type !== 'MOVE_PENDING_TO_AVAILABLE') {
        return false;
      }
      if (filterType === 'DEBIT' && tx.type !== 'DEBIT_AVAILABLE') {
        return false;
      }
      if (startDate || endDate) {
        const txTime = new Date(tx.createdAt).getTime();
        if (startDate && txTime < new Date(startDate).getTime()) return false;
        if (endDate && txTime > new Date(endDate).getTime() + 24 * 60 * 60 * 1000) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchRef = tx.referenceId?.toLowerCase().includes(q) || tx.referenceType?.toLowerCase().includes(q);
        return matchDesc || matchRef;
      }
      return true;
    });
  }, [transactions, filterType, startDate, endDate, searchQuery]);

  const totalCredit = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'CREDIT_AVAILABLE' || t.type === 'MOVE_PENDING_TO_AVAILABLE')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const totalDebit = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'DEBIT_AVAILABLE')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery, startDate, endDate, pageSize]);

  const handleExportCSV = () => {
    const headers = [
      'Mã Giao Dịch',
      'Thời Gian',
      'Loại Giao Dịch',
      'Mô Tả',
      'Mã Tham Chiếu',
      'Số Tiền Biến Động (VNĐ)',
      'Số Dư Sau Giao Dịch (VNĐ)',
    ];

    const rows = filteredTransactions.map((tx) => {
      const typeMeta = getTransactionTypeDetails(tx.type);
      return [
        `"${tx.id}"`,
        `"${formatVietnamDateTime(tx.createdAt)}"`,
        `"${typeMeta.label}"`,
        `"${tx.description?.replace(/"/g, '""') || ''}"`,
        `"${tx.referenceId || ''}"`,
        typeMeta.isPositive ? Number(tx.amount) : -Number(tx.amount),
        Number(tx.availableAfter),
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nhat_Ky_Bien_Dong_So_Du_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Nhật Ký Biến Động Số Dư</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận thời gian thực mọi biến động cộng doanh thu bán sách, giải ngân ký quỹ và các lệnh rút tiền về ngân hàng.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">download</span>
            <span>Xuất Nhật Ký (CSV)</span>
          </button>
          <Link
            href="/seller/finance"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#00875A] text-white hover:bg-[#003B2B] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Rút Tiền Ví</span>
          </Link>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Tổng Giao Dịch Ghi Nhận
            </span>
            <div className="text-2xl font-black text-gray-900 font-mono mt-1">
              {transactions.length} bản ghi
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">history</span>
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-xs flex items-center justify-between bg-gradient-to-b from-emerald-50/30 to-white">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Tổng Doanh Thu Đã Cộng
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
              +{formatVND(totalCredit)}
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">add_circle</span>
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Tổng Tiền Đã Rút Về STK
            </span>
            <div className="text-2xl font-black text-gray-700 font-mono mt-1">
              -{formatVND(totalDebit)}
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">remove_circle</span>
          </span>
        </div>
      </div>

      {/* 3. TABLE TRANSACTIONS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'ALL', label: 'Tất Cả' },
              { key: 'CREDIT', label: 'Cộng Doanh Thu' },
              { key: 'DEBIT', label: 'Lệnh Rút Tiền' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterType(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterType === f.key
                    ? 'bg-[#003B2B] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm nội dung, mã đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-400">
            <span className="material-symbols-outlined text-4xl">receipt_long</span>
            <p className="text-sm font-bold text-gray-700">Chưa có bản ghi biến động số dư</p>
            <p className="text-xs text-gray-500">
              Giao dịch sẽ tự động ghi nhận khi đơn hàng giao thành công hoặc khi bạn thực hiện rút tiền.
            </p>
          </div>
        ) : (
        <div className="w-full overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3.5 pl-4 pr-2 w-[24%]">Thời Gian &amp; Mã Ref</th>
                <th className="py-3.5 px-3 w-[32%]">Loại Giao Dịch &amp; Nội Dung</th>
                <th className="py-3.5 px-3 w-[18%] text-right">Biến Động</th>
                <th className="py-3.5 px-3 w-[16%] text-right">Số Dư Sau Giao Dịch</th>
                <th className="py-3.5 pl-2 pr-4 w-[10%] text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.map((item) => {
                const isExpanded = !!expandedTxIds[item.id];
                const typeMeta = getTransactionTypeDetails(item.type);

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => toggleExpand(item.id)}
                      className={`hover:bg-emerald-50/30 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-emerald-50/40' : 'bg-white'
                      }`}
                    >
                      {/* 1. Thời gian & Mã Ref */}
                      <td className="py-3 pl-4 pr-2 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(item.id);
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/50 transition-colors shrink-0"
                          >
                            <span
                              className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-emerald-700' : ''
                              }`}
                            >
                              chevron_right
                            </span>
                          </button>
                          <div className="min-w-0">
                            <span className="font-mono text-slate-700 text-xs block truncate">
                              {formatVietnamDateTime(item.createdAt)}
                            </span>
                            {item.referenceId ? (
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                Ref: {item.referenceId}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                ID: {item.id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Loại giao dịch & Mô tả */}
                      <td className="py-3 px-3 align-middle">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${typeMeta.badgeClass}`}
                          >
                            <span className="material-symbols-outlined text-[12px]">{typeMeta.icon}</span>
                            <span>{typeMeta.label}</span>
                          </span>
                          <span className="font-medium text-slate-900 text-xs line-clamp-1" title={item.description || 'Giao dịch ví'}>
                            {item.description || 'Giao dịch số dư ví'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Biến động */}
                      <td
                        className={`py-3 px-3 font-mono font-bold text-right align-middle whitespace-nowrap text-xs ${
                          typeMeta.isPositive ? 'text-[#00875A]' : 'text-slate-700'
                        }`}
                      >
                        {typeMeta.isPositive ? `+${formatVND(item.amount)}` : `-${formatVND(item.amount)}`}
                      </td>

                      {/* 4. Số dư sau biến động */}
                      <td className="py-3 px-3 font-mono font-bold text-right align-middle text-slate-900 whitespace-nowrap text-xs">
                        {formatVND(item.availableAfter)}
                      </td>

                      {/* 5. Chi tiết */}
                      <td className="py-3 pl-2 pr-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedTx(item)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                          >
                            Chi Tiết
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Subcards Detail Panel */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={5} className="p-4 border-t border-b border-emerald-100/70">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-emerald-200/70 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Card 1: Thông tin giao dịch */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                <span className="material-symbols-outlined text-[16px] text-[#00875A]">receipt_long</span>
                                <span>Thông Tin Giao Dịch</span>
                              </div>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Mã giao dịch:</span>
                                  <span className="font-mono text-slate-700 text-[11px]">{item.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Thời gian tạo:</span>
                                  <span className="font-medium text-slate-900">{formatVietnamDateTime(item.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Mã tham chiếu:</span>
                                  <span className="font-mono font-semibold text-slate-800">{item.referenceId || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Biến động tài chính */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                <span className="material-symbols-outlined text-[16px] text-amber-600">account_balance_wallet</span>
                                <span>Biến Động Số Dư</span>
                              </div>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Số tiền biến động:</span>
                                  <span className={`font-bold font-mono ${typeMeta.isPositive ? 'text-[#00875A]' : 'text-slate-700'}`}>
                                    {typeMeta.isPositive ? `+${formatVND(item.amount)}` : `-${formatVND(item.amount)}`}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Số dư khả dụng sau GD:</span>
                                  <span className="font-bold text-slate-900">{formatVND(item.availableAfter)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Phân loại:</span>
                                  <span className="font-semibold text-slate-800">{typeMeta.label}</span>
                                </div>
                              </div>
                            </div>

                            {/* Card 3: Diễn giải & Thao tác */}
                            <div className="space-y-2 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-emerald-600">info</span>
                                  <span>Diễn Giải Nội Dung</span>
                                </div>
                                <p className="text-[11.5px] text-slate-700 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  {item.description || 'Không có mô tả bổ sung.'}
                                </p>
                              </div>
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTx(item);
                                  }}
                                  className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#003B2B] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                  <span>Xem Chi Tiết Đầy Đủ</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination Toolbar */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 text-xs text-gray-600 mt-4 rounded-xl">
          <div className="flex items-center gap-2">
            <span>Hiển thị mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-hidden cursor-pointer"
            >
              <option value={10}>10 dòng</option>
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
            <span>Tổng {filteredTransactions.length} giao dịch</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
            >
              ← Trước
            </button>
            <span className="px-3 py-1 font-bold text-gray-800">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
            >
              Sau →
            </button>
          </div>
        </div>
      </div>

      {/* 4. DETAIL MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <span className="material-symbols-outlined">receipt</span>
                </span>
                <h3 className="text-base font-bold text-gray-900">Chi Tiết Giao Dịch Ví</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-gray-700">
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Mã Giao Dịch:</span>
                <span className="font-mono font-bold text-gray-900">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Thời Gian Ghi Nhận:</span>
                <span className="font-semibold text-gray-900">{formatVietnamDateTime(selectedTx.createdAt)}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Loại Biến Động:</span>
                <span className="font-bold text-gray-900">
                  {getTransactionTypeDetails(selectedTx.type).label}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Mô Tả:</span>
                <span className="font-semibold text-gray-900 max-w-[200px] text-right">
                  {selectedTx.description || 'Giao dịch ví'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-emerald-50 text-emerald-900 rounded-xl font-bold">
                <span>Số Tiền Biến Động:</span>
                <span className="text-base">
                  {getTransactionTypeDetails(selectedTx.type).isPositive ? '+' : '-'}
                  {formatVND(selectedTx.amount)}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Số Dư Sau Biến Động:</span>
                <span className="font-black text-gray-900">{formatVND(selectedTx.availableAfter)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
