"use client";

import React, { useState } from 'react';
import type { BestsellerItem } from '../../api/analyticsApi';

export interface TopProductsTableProps {
  items: BestsellerItem[];
  rankingBy: 'UNITS' | 'GMV';
  onRankingByChange?: (mode: 'UNITS' | 'GMV') => void;
  loading?: boolean;
}

function formatVND(val: number | string): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

export function TopProductsTable({
  items,
  rankingBy,
  onRankingByChange,
  loading = false,
}: TopProductsTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (bookId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(bookId);
      setCopiedId(bookId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-4 animate-pulse">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div className="h-4 w-48 bg-slate-200 rounded"></div>
          <div className="h-7 w-24 bg-slate-100 rounded-lg"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-50 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-4 flex flex-col justify-between">
      <div>
        {/* Header & Ranking Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">auto_stories</span>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 font-editorial">
                Sản Phẩm Bán Chạy Toàn Sàn
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                Top {items.length}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Xếp hạng ấn phẩm theo số lượng bán và doanh thu (Platform Bestsellers)
            </p>
          </div>

          {/* Ranking Mode Toggle */}
          {onRankingByChange && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => onRankingByChange('UNITS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  rankingBy === 'UNITS'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Theo Số Lượng
              </button>
              <button
                onClick={() => onRankingByChange('GMV')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  rankingBy === 'GMV'
                    ? 'bg-white text-[#00875A] shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Theo GMV
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}
        {!items || items.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            <span className="material-symbols-outlined text-3xl mb-1 text-gray-300">library_books</span>
            <p>Không có sản phẩm nào có doanh số trong khoảng thời gian này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-2 w-12 text-center">Hạng</th>
                  <th className="py-2 px-3">Mã Sách (Book ID)</th>
                  <th className="py-2 px-3 text-right">Số Bản Bán</th>
                  <th className="py-2 px-3 text-right">Tổng GMV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {items.map((bk, idx) => {
                  const isCopied = copiedId === bk.bookId;
                  return (
                    <tr key={bk.bookId} className="hover:bg-gray-50/80 transition-colors">
                      {/* Rank badge */}
                      <td className="py-2.5 px-2 text-center">
                        {idx === 0 ? (
                          <span className="inline-flex w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black items-center justify-center shadow-2xs">
                            1
                          </span>
                        ) : idx === 1 ? (
                          <span className="inline-flex w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black items-center justify-center">
                            2
                          </span>
                        ) : idx === 2 ? (
                          <span className="inline-flex w-5 h-5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black items-center justify-center">
                            3
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold text-[11px]">{idx + 1}</span>
                        )}
                      </td>

                      {/* Book ID with copy button */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-800">
                        <div className="flex items-center gap-1.5">
                          <span title={bk.bookId} className="truncate max-w-[150px] sm:max-w-[200px]">
                            {bk.bookId}
                          </span>
                          <button
                            onClick={() => handleCopy(bk.bookId)}
                            className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors cursor-pointer"
                            title="Sao chép Book ID"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {isCopied ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* Units */}
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                        {bk.units.toLocaleString('vi-VN')} bản
                      </td>

                      {/* GMV */}
                      <td className="py-2.5 px-3 text-right font-extrabold text-gray-900 font-editorial">
                        {formatVND(bk.gmv)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default TopProductsTable;
