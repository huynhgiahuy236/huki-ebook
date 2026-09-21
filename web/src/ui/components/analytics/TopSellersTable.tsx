"use client";

import React, { useState, useMemo } from 'react';
import type { PlatformGmvByStoreItem } from '../../api/analyticsApi';

export interface TopSellersTableProps {
  byStore: PlatformGmvByStoreItem[];
  totalGmv: string;
  loading?: boolean;
}

function formatVND(val: number | string): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

export function TopSellersTable({ byStore, totalGmv, loading = false }: TopSellersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalGmvNum = useMemo(() => Number(totalGmv) || 0, [totalGmv]);

  // Local table-only filtering (does not mutate platform metrics)
  const filteredStores = useMemo(() => {
    if (!byStore) return [];
    if (!searchTerm.trim()) return byStore;
    const term = searchTerm.trim().toLowerCase();
    return byStore.filter((st) => st.storeId.toLowerCase().includes(term));
  }, [byStore, searchTerm]);

  const handleCopy = (storeId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(storeId);
      setCopiedId(storeId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-4 animate-pulse">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div className="h-4 w-48 bg-slate-200 rounded"></div>
          <div className="h-7 w-28 bg-slate-100 rounded-lg"></div>
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
        {/* Header & Local Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00875A] text-[20px]">storefront</span>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 font-editorial">
                Phân Bổ GMV Theo Gian Hàng
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#00875A] text-[10px] font-bold border border-emerald-200">
                {byStore.length} gian hàng
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Xếp hạng đóng góp GMV từ cao xuống thấp (dữ liệu chính thức từ DailyAggregate)
            </p>
          </div>

          {/* Local search input */}
          <div className="relative shrink-0 w-full sm:w-48">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Store ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table Content */}
        {!byStore || byStore.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            <span className="material-symbols-outlined text-3xl mb-1 text-gray-300">store_mall_directory</span>
            <p>Không có gian hàng phát sinh GMV trong khoảng thời gian này.</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            <p>Không tìm thấy gian hàng nào khớp với từ khóa &quot;{searchTerm}&quot;.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-2 w-12 text-center">Hạng</th>
                  <th className="py-2 px-3">Mã Gian Hàng (Store ID)</th>
                  <th className="py-2 px-3 text-right">GMV Đóng Góp</th>
                  <th className="py-2 px-3 text-right w-24">Tỷ Trọng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {filteredStores.slice(0, 10).map((st, idx) => {
                  const stGmvNum = Number(st.gmv) || 0;
                  const sharePercent = totalGmvNum > 0 ? (stGmvNum / totalGmvNum) * 100 : 0;
                  const isCopied = copiedId === st.storeId;

                  return (
                    <tr key={st.storeId} className="hover:bg-gray-50/80 transition-colors">
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

                      {/* Store ID with copy button */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-800">
                        <div className="flex items-center gap-1.5">
                          <span title={st.storeId} className="truncate max-w-[150px] sm:max-w-[200px]">
                            {st.storeId}
                          </span>
                          <button
                            onClick={() => handleCopy(st.storeId)}
                            className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors cursor-pointer"
                            title="Sao chép Store ID"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {isCopied ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* GMV */}
                      <td className="py-2.5 px-3 text-right font-extrabold text-gray-900 font-editorial">
                        {formatVND(st.gmv)}
                      </td>

                      {/* Share progress bar */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[11px] font-bold text-emerald-700">
                            {sharePercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-[#00875A] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(sharePercent, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredStores.length > 10 && (
        <div className="pt-2 text-center border-t border-gray-100 text-[11px] text-gray-400">
          Hiển thị top 10 / {filteredStores.length} gian hàng
        </div>
      )}
    </div>
  );
}

export default TopSellersTable;
