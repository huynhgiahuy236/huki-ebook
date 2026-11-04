"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useShipper, WalletTransaction } from '@/ui/context/ShipperContext';
import {
  DataTableFilterBar,
  DataTableBulkActionBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '../common';
import GroupedDataTable, { Column, StandardPaginationBar } from '../common/GroupedDataTable';

export default function ShipperWalletView() {
  const { wallet, transactions, requestWithdrawal } = useShipper();

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankInfo, setBankInfo] = useState({
    bank: 'Vietcombank (VCB)',
    account: '0123456789',
    name: 'NGUYEN VAN HUNG',
  });
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Filters & Selection
  const [activeTab, setActiveTab] = useState<'ALL' | 'EARNING' | 'COD_COLLECT' | 'COD_REMITTANCE' | 'WITHDRAWAL'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Double-Lock: strictly 10 items / page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Multi-Select
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeTab !== 'ALL' && tx.type !== activeTab) return false;
      if (!matchesDateFilter(tx.createdAt, dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          tx.id.toLowerCase().includes(q) ||
          tx.title.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          (tx.orderCode || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, activeTab, dateFilter, searchQuery]);

  // Double-Lock slicing
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const selectedCount = Object.keys(selectedIds).filter((k) => selectedIds[k]).length;

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(withdrawAmount.replace(/\D/g, ''), 10);
    if (!val || val <= 0 || val > wallet.availableEarnings) return;
    requestWithdrawal(val, bankInfo);
    setWithdrawSuccess(true);
    setTimeout(() => {
      setWithdrawSuccess(false);
      setWithdrawOpen(false);
      setWithdrawAmount('');
    }, 2000);
  };

  const walletBulkActionGroups: BulkActionGroup[] = useMemo(
    () => [
      {
        groupLabel: 'Xuất sao kê & Kiểm toán',
        actions: [
          {
            value: 'EXPORT_EXCEL',
            label: 'Xuất sao kê biến động số dư (Excel/CSV)',
          },
          {
            value: 'PRINT_REPORTS',
            label: 'In bảng kê tài chính bưu tá',
          },
        ],
      },
    ],
    []
  );

  const handleExecuteBulkAction = async (action: string) => {
    if (!selectedCount) return;
    setBulkLoading(true);
    try {
      if (action === 'EXPORT_EXCEL') {
        alert(`Đã xuất sao kê ${selectedCount} giao dịch sang Excel thành công!`);
      } else if (action === 'PRINT_REPORTS') {
        window.print();
      }
      setSelectedIds({});
    } finally {
      setBulkLoading(false);
    }
  };

  // 5 CỘT VÀNG CHUẨN MỰC
  const columns: Column<WalletTransaction>[] = [
    {
      key: 'id',
      title: 'Mã GD & Thời Gian',
      width: '22%',
      render: (_, row) => {
        return (
          <div className="space-y-1 py-1 font-mono">
            <strong className="text-xs font-bold text-slate-900 block">{row.id}</strong>
            <span className="text-[11px] text-slate-400 font-sans block">{row.createdAt}</span>
          </div>
        );
      },
    },
    {
      key: 'type',
      title: 'Loại Giao Dịch',
      width: '20%',
      render: (_, row) => {
        const isEarning = row.type === 'EARNING';
        const isCodCollect = row.type === 'COD_COLLECT';
        const isRemittance = row.type === 'COD_REMITTANCE';

        return (
          <div className="py-1">
            <span
              className={`px-2.5 py-1 rounded text-[10.5px] font-bold inline-block ${
                isEarning
                  ? 'bg-emerald-100 text-emerald-900'
                  : isCodCollect
                  ? 'bg-amber-100 text-amber-900'
                  : isRemittance
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-purple-100 text-purple-900'
              }`}
            >
              {isEarning
                ? 'Tiền công ship'
                : isCodCollect
                ? 'Nợ COD sàn (đã trừ ship)'
                : isRemittance
                ? 'Nộp COD về Sàn'
                : 'Rút tiền về NH'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'description',
      title: 'Nội Dung & Đơn Liên Quan',
      width: '28%',
      render: (_, row) => {
        return (
          <div className="text-xs space-y-0.5 py-1">
            <div className="font-bold text-slate-800 break-words line-clamp-2 leading-snug">
              {row.title}
            </div>
            <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">
              {row.description}
            </div>
            {row.orderCode && (
              <div className="text-[10.5px] text-slate-400 font-mono font-bold">
                Đơn hàng: {row.orderCode}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'amount',
      title: 'Số Tiền Biến Động',
      width: '16%',
      render: (_, row) => {
        const isEarning = row.type === 'EARNING';
        const isCodCollect = row.type === 'COD_COLLECT';
        const isRemittance = row.type === 'COD_REMITTANCE';

        return (
          <div className="py-1">
            <strong
              className={`text-sm font-black ${
                isEarning
                  ? 'text-[#00875A]'
                  : isCodCollect
                  ? 'text-amber-700'
                  : isRemittance
                  ? 'text-blue-700'
                  : 'text-purple-700'
              }`}
            >
              {isEarning || isCodCollect ? '+' : '-'}
              {row.amount.toLocaleString('vi-VN')}đ
            </strong>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng Thái',
      width: '14%',
      align: 'right',
      render: () => {
        return (
          <div className="text-right py-1">
            <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Thành công
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP 2 MAIN FINANCIAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: VÍ THU NHẬP CƯỚC KHẢ DỤNG */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs flex flex-col justify-between gap-5 relative overflow-hidden hover:border-[#00875A]/40 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                1. Ví Thu Nhập Cước Khả Dụng
              </span>
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">savings</span>
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-500 block">Số dư có thể rút ngay:</span>
              <strong className="text-3xl font-black text-[#00875A] block tracking-tight mt-0.5">
                {wallet.availableEarnings.toLocaleString('vi-VN')}đ
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-950 space-y-1">
              <p>• Tổng thu nhập tích lũy: <strong>{wallet.totalEarnings.toLocaleString('vi-VN')}đ</strong></p>
              <p>• Rút tiền 24/7 về tài khoản ngân hàng bưu tá qua Napas 247, miễn phí giao dịch.</p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setWithdrawAmount(wallet.availableEarnings.toString());
                setWithdrawOpen(!withdrawOpen);
              }}
              disabled={wallet.availableEarnings <= 0}
              className="w-full py-2.5 rounded-xl bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[17px]">account_balance</span>
              <span>{withdrawOpen ? 'Đóng Khung Rút Tiền' : 'Rút Tiền Về Ngân Hàng'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: CÔNG NỢ THU HỘ COD */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs flex flex-col justify-between gap-5 relative overflow-hidden hover:border-amber-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                2. Công Nợ Tiền Mặt Thu Hộ (COD)
              </span>
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">payments</span>
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-500 block mb-1">Tiền mặt COD tạm giữ cần nộp (đã trừ cước):</span>
              {wallet.codDebt > 0 ? (
                <div className="inline-block font-mono text-2xl sm:text-3xl font-black text-rose-700 bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-200 shadow-2xs">
                  {wallet.codDebt.toLocaleString('vi-VN')}đ
                </div>
              ) : (
                <strong className="text-3xl font-black text-slate-800 block tracking-tight">
                  0đ
                </strong>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
              <p>• <strong>Cơ chế bóc tách COD:</strong> Tiền thu khách - Cước ship giữ lại = Tiền nộp sàn.</p>
              <p>• Bưu tá giữ lại tiền cước ship cho mình, chỉ chuyển nộp phần tiền sách về quỹ HuKi.</p>
            </div>
          </div>

          <div>
            {wallet.codDebt > 0 ? (
              <Link
                href="/shipper/wallet/remit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">qr_code_2</span>
                <span>Nộp Tiền COD Qua PayOS ({wallet.codDebt.toLocaleString('vi-VN')}đ)</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            ) : (
              <div className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[17px] text-[#00875A]">check_circle</span>
                <span>Đã nộp đủ COD (Không có công nợ tồn)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IN-PAGE WITHDRAWAL PANEL */}
      {withdrawOpen && (
        <div className="bg-white rounded-2xl border border-emerald-300 p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-[#00875A] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Rút Tiền Về Tài Khoản Ngân Hàng</h3>
                <span className="text-xs text-gray-500">Tiền chuyển tức thì 24/7 qua NAPAS 247</span>
              </div>
            </div>
            <button
              onClick={() => setWithdrawOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
            >
              ✕ Đóng
            </button>
          </div>

          {withdrawSuccess ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#00875A]">check_circle</span>
              <span>Lệnh rút tiền đã được thực hiện thành công! Tiền đang được chuyển về ngân hàng.</span>
            </div>
          ) : (
            <form onSubmit={handleWithdraw} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-gray-600 font-bold mb-1">Số tiền rút (VNĐ)</label>
                <input
                  type="number"
                  max={wallet.availableEarnings}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Nhập số tiền..."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-gray-900 font-bold focus:outline-hidden focus:border-[#00875A] focus:bg-white"
                  required
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Tối đa: {wallet.availableEarnings.toLocaleString('vi-VN')}đ
                </span>
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-1">Ngân hàng thụ hưởng</label>
                <input
                  type="text"
                  value={bankInfo.bank}
                  onChange={(e) => setBankInfo({ ...bankInfo, bank: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-gray-900 focus:outline-hidden focus:border-[#00875A] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-1">Số tài khoản &amp; Tên chủ thẻ</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bankInfo.account}
                    onChange={(e) => setBankInfo({ ...bankInfo, account: e.target.value })}
                    className="w-1/2 px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-gray-900 font-mono focus:outline-hidden focus:border-[#00875A] focus:bg-white"
                    required
                  />
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#00875A] hover:bg-[#003B2B] text-white font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                  >
                    Xác Nhận Rút
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">Chủ tài khoản: {bankInfo.name}</span>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 2. TRANSACTIONS LEDGER WITH UNIVERSAL FILTER BAR */}
      <div className="space-y-4">
        <DataTableFilterBar
          tabs={[
            { key: 'ALL', label: 'Tất cả biến động', count: transactions.length },
            { key: 'EARNING', label: 'Cước thu nhập', count: transactions.filter((t) => t.type === 'EARNING').length },
            { key: 'COD_COLLECT', label: 'Thu hộ COD', count: transactions.filter((t) => t.type === 'COD_COLLECT').length },
            { key: 'COD_REMITTANCE', label: 'Nộp tiền COD', count: transactions.filter((t) => t.type === 'COD_REMITTANCE').length },
            { key: 'WITHDRAWAL', label: 'Rút tiền', count: transactions.filter((t) => t.type === 'WITHDRAWAL').length },
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab as any);
            setCurrentPage(1);
          }}
          dateFilter={dateFilter}
          onDateFilterChange={(df) => {
            setDateFilter(df);
            setCurrentPage(1);
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          searchPlaceholder="Tìm mã giao dịch, đơn liên quan, nội dung..."
          bulkActionGroups={walletBulkActionGroups}
          selectedCount={selectedCount}
          totalCount={filteredTransactions.length}
          onExecuteBulkAction={handleExecuteBulkAction}
          onClearSelection={() => setSelectedIds({})}
          bulkLoading={bulkLoading}
          itemName="giao dịch"
          className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        />

        {/* 3. Bulk Action Bar */}
        <DataTableBulkActionBar
          selectedCount={selectedCount}
          totalCount={filteredTransactions.length}
          onClearSelection={() => setSelectedIds({})}
          actionGroups={walletBulkActionGroups}
          onExecuteAction={handleExecuteBulkAction}
          isLoading={bulkLoading}
          itemName="giao dịch"
        />

        {/* 4. Grouped Data Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
          <GroupedDataTable
            columns={columns}
            data={paginatedTransactions}
            keyField="id"
            expandable
            expandedRowRender={(row) => {
              const isEarning = row.type === 'EARNING';
              const isCodCollect = row.type === 'COD_COLLECT';
              const isRemittance = row.type === 'COD_REMITTANCE';

              return (
                <div className="p-4 bg-slate-50 dark:bg-neutral-800/40 rounded-xl space-y-4 text-xs">
                  {/* 3-CARD MASTER-DETAIL CONTAINER */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                    {/* Card 1: Định Danh Giao Dịch */}
                    <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2">
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                        <span className="material-symbols-outlined text-[15px] text-[#00875A]">receipt</span>
                        <span>Thông Tin Định Danh</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Mã giao dịch:</span>
                          <span className="font-mono font-bold text-slate-900">{row.id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Thời gian phát sinh:</span>
                          <span className="text-slate-700 font-semibold">{row.createdAt}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Cổng thực hiện:</span>
                          <span className="text-slate-700 font-semibold">
                            {isRemittance ? 'VietQR / PayOS Cổng Quỹ Sàn' : isEarning ? 'Hệ thống điều phối HuKi Express' : 'Cổng thanh toán tự động'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Chứng Từ & Đơn Hàng Liên Quan */}
                    <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2">
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                        <span className="material-symbols-outlined text-[15px] text-blue-600">assignment</span>
                        <span>Chứng Từ &amp; Diễn Giải</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Tiêu đề:</span>
                          <span className="font-bold text-slate-900 break-words line-clamp-2 leading-snug">{row.title}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Chi tiết:</span>
                          <span className="text-slate-600 break-words line-clamp-2 leading-snug">{row.description}</span>
                        </div>
                        {row.orderCode && (
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block">Mã đơn liên kết:</span>
                            <span className="font-mono font-bold text-[#003B2B]">{row.orderCode}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 3: Chi Tiết Dòng Tiền */}
                    <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2">
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                        <span className="material-symbols-outlined text-[15px] text-amber-600">account_balance_wallet</span>
                        <span>Biến Động Dòng Tiền</span>
                      </div>
                      <div className="space-y-2 pt-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Số tiền:</span>
                          <strong
                            className={`text-base font-black ${
                              isEarning
                                ? 'text-[#00875A]'
                                : isCodCollect
                                ? 'text-amber-700'
                                : isRemittance
                                ? 'text-blue-700'
                                : 'text-purple-700'
                            }`}
                          >
                            {isEarning || isCodCollect ? '+' : '-'}
                            {row.amount.toLocaleString('vi-VN')}đ
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Ví tác động:</span>
                          <span className="font-semibold text-slate-800">
                            {isEarning
                              ? 'Ví thu nhập khả dụng'
                              : isCodCollect
                              ? 'Ví công nợ COD tạm giữ'
                              : isRemittance
                              ? 'Ví công nợ COD (giảm nợ)'
                              : 'Ví thu nhập (rút tiền)'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500 text-[11px]">Trạng thái:</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Hạch toán thành công
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
            pagination={false}
            selectable
            selectedRowKeys={Object.keys(selectedIds).filter((k) => selectedIds[k])}
            onSelectionChange={(keys) => {
              const next: Record<string, boolean> = {};
              keys.forEach((k) => {
                next[String(k)] = true;
              });
              setSelectedIds(next);
            }}
            emptyTitle="Chưa có giao dịch biến động nào!"
            emptyMessage="Các khoản thu nhập giao hàng và thanh toán COD sẽ hiển thị chi tiết tại đây."
          />

          {/* 5. Standard Pagination Bar (Double-Lock: 10 items/page) */}
          <StandardPaginationBar
            currentPage={currentPage}
            totalItems={filteredTransactions.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            itemLabel="giao dịch"
          />
        </div>
      </div>
    </div>
  );
}
