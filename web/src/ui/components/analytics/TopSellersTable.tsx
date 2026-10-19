"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { PlatformGmvByStoreItem } from '../../api/analyticsApi';
import { adminApi } from '../../api/adminApi';
import GroupedDataTable, { type Column } from '../common/GroupedDataTable';

export interface TopSellersTableProps {
  byStore: PlatformGmvByStoreItem[];
  totalGmv: string;
  loading?: boolean;
}

export interface StoreGmvRow {
  id: string;
  storeId: string;
  storeName: string;
  businessName: string;
  businessType: string;
  gmv: number;
  sharePercent: number;
  ordersCount: number;
  aov: number;
  commission: number;
  status: 'ACTIVE' | 'PENDING' | 'LOCKED';
  rank: number;
}

function formatVND(val: number | string): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

export function TopSellersTable({ byStore, totalGmv, loading = false }: TopSellersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([]);

  // Metadata store cache
  const [storeMetaMap, setStoreMetaMap] = useState<
    Map<string, { storeName: string; businessName: string; businessType: string }>
  >(new Map());

  // Fetch real store & business names from backend
  useEffect(() => {
    let mounted = true;
    adminApi
      .getBusinesses({ limit: 100 })
      .then((res) => {
        if (!mounted || !res.success || !Array.isArray(res.data)) return;
        const metaMap = new Map<
          string,
          { storeName: string; businessName: string; businessType: string }
        >();

        res.data.forEach((b: any) => {
          if (Array.isArray(b.stores)) {
            b.stores.forEach((s: any) => {
              if (s.id) {
                metaMap.set(s.id, {
                  storeName: s.name || `Gian Hàng ${s.id.substring(0, 8)}`,
                  businessName: b.name || 'Doanh Nghiệp / NXB',
                  businessType: b.type || 'PUBLISHER',
                });
              }
            });
          }
        });

        setStoreMetaMap(metaMap);
      })
      .catch((err) => {
        console.warn('[TopSellersTable] Could not fetch businesses metadata:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const totalGmvNum = useMemo(() => Number(totalGmv) || 0, [totalGmv]);

  // Transform raw items into enriched rows
  const allRows: StoreGmvRow[] = useMemo(() => {
    if (!byStore || !Array.isArray(byStore)) return [];

    return byStore.map((st, idx) => {
      const gmvNum = Number(st.gmv) || 0;
      const share = totalGmvNum > 0 ? (gmvNum / totalGmvNum) * 100 : 0;
      const meta = storeMetaMap.get(st.storeId);

      // Real order counts from database via analyticsApi
      const realOrders = typeof st.orders === 'number' ? st.orders : 0;
      const aov = realOrders > 0 ? gmvNum / realOrders : 0;
      // Standard platform commission take-rate: 8%
      const commission = Math.round(gmvNum * 0.08);

      return {
        id: st.storeId,
        storeId: st.storeId,
        storeName: meta?.storeName || `Gian Hàng (${st.storeId.substring(0, 8)})`,
        businessName: meta?.businessName || 'Nhà Xuất Bản / Đơn Vị Phát Hành',
        businessType: meta?.businessType === 'PUBLISHER' ? 'Nhà Xuất Bản' : 'Đối Tác Bán Lẻ',
        gmv: gmvNum,
        sharePercent: share,
        ordersCount: realOrders,
        aov,
        commission,
        status: 'ACTIVE',
        rank: idx + 1,
      };
    });
  }, [byStore, totalGmvNum, storeMetaMap]);

  // Filtered rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return allRows;
    const term = searchTerm.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.storeId.toLowerCase().includes(term) ||
        r.storeName.toLowerCase().includes(term) ||
        r.businessName.toLowerCase().includes(term)
    );
  }, [allRows, searchTerm]);

  // Grand total summary
  const grandTotalGmv = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + r.gmv, 0);
  }, [filteredRows]);

  const grandTotalCommission = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + r.commission, 0);
  }, [filteredRows]);

  const grandTotalOrders = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + r.ordersCount, 0);
  }, [filteredRows]);

  // Handle clipboard copy
  const handleCopy = (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(storeId);
      setCopiedId(storeId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // GroupedDataTable column specifications
  const columns: Column<StoreGmvRow>[] = useMemo(
    () => [
      {
        key: 'rank',
        title: 'Hạng',
        align: 'center',
        width: 60,
        render: (_, row) => {
          if (row.rank === 1) {
            return (
              <span className="inline-flex w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black items-center justify-center shadow-2xs">
                1
              </span>
            );
          }
          if (row.rank === 2) {
            return (
              <span className="inline-flex w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black items-center justify-center">
                2
              </span>
            );
          }
          if (row.rank === 3) {
            return (
              <span className="inline-flex w-5 h-5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black items-center justify-center">
                3
              </span>
            );
          }
          return <span className="text-gray-400 font-bold text-[11px]">{row.rank}</span>;
        },
      },
      {
        key: 'storeName',
        title: 'Gian Hàng & NXB Trực Thuộc',
        render: (_, row) => (
          <div className="flex flex-col gap-0.5 max-w-[260px] sm:max-w-[320px]">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs truncate">
              <span className="material-symbols-outlined text-[16px] text-[#00875A] shrink-0">
                storefront
              </span>
              <span className="truncate" title={row.storeName}>
                {row.storeName}
              </span>
            </div>
            <div className="text-[10.5px] text-gray-500 truncate" title={row.businessName}>
              {row.businessName} •{' '}
              <span className="text-emerald-700 font-semibold">{row.businessType}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'storeId',
        title: 'Mã Gian Hàng',
        width: 150,
        render: (_, row) => {
          const isCopied = copiedId === row.storeId;
          return (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-700">
              <span title={row.storeId} className="truncate max-w-[100px]">
                {row.storeId.substring(0, 8)}...
              </span>
              <button
                onClick={(e) => handleCopy(row.storeId, e)}
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors cursor-pointer"
                title="Sao chép Store ID"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {isCopied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          );
        },
      },
      {
        key: 'ordersCount',
        title: 'Đơn Hoàn Tất',
        align: 'right',
        width: 100,
        render: (_, row) => (
          <span className="font-mono text-xs font-bold text-gray-800">
            {row.ordersCount.toLocaleString('vi-VN')}
          </span>
        ),
      },
      {
        key: 'gmv',
        title: 'GMV Đóng Góp',
        align: 'right',
        render: (_, row) => (
          <div className="flex flex-col items-end">
            <span className="font-editorial font-extrabold text-xs text-gray-900">
              {formatVND(row.gmv)}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
              <span>{row.sharePercent.toFixed(1)}%</span>
              <span className="text-gray-400 font-normal">toàn sàn</span>
            </div>
          </div>
        ),
      },
      {
        key: 'commission',
        title: 'Hoa Hồng Sàn (8%)',
        align: 'right',
        render: (_, row) => (
          <span className="font-mono text-xs font-bold text-emerald-700">
            {formatVND(row.commission)}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'center',
        width: 110,
        render: () => (
          <div className="flex justify-center">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Đang Hoạt Động
            </span>
          </div>
        ),
      },
    ],
    [copiedId]
  );

  // Render Expandable Detailed Accordion
  const renderStoreDetail = useCallback((row: StoreGmvRow) => {
    return (
      <div className="flex flex-col gap-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 my-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-[20px]">info</span>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Thông Tin Đối Tác &amp; Cơ Cấu Tài Chính: {row.storeName}
            </h4>
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            Mã định danh hệ thống: <strong className="text-gray-800">{row.storeId}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
            <div className="text-[10.5px] text-gray-500 font-medium">Doanh Nghiệp Sở Hữu</div>
            <div className="text-xs font-bold text-gray-900 mt-1 truncate" title={row.businessName}>
              {row.businessName}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
            <div className="text-[10.5px] text-gray-500 font-medium">Giá Trị Trung Bình / Đơn (AOV)</div>
            <div className="text-xs font-bold text-emerald-700 font-editorial mt-1">
              {formatVND(row.aov)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
            <div className="text-[10.5px] text-gray-500 font-medium">Tỷ Lệ Chiết Khấu Sàn (Take-rate)</div>
            <div className="text-xs font-bold text-indigo-700 font-mono mt-1">
              8.0% (Cố định hợp đồng)
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
            <div className="text-[10.5px] text-gray-500 font-medium">Nghĩa Vụ Quyết Toán Dự Kiến</div>
            <div className="text-xs font-bold text-gray-900 font-editorial mt-1">
              {formatVND(row.gmv - row.commission)}
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

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
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00875A] text-[20px]">
                storefront
              </span>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 font-editorial">
                Phân Bổ GMV &amp; Hoa Hồng Theo Gian Hàng / NXB
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#00875A] text-[10px] font-bold border border-emerald-200">
                {byStore.length} gian hàng
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Bảng dữ liệu Grouped Data Table tổng hợp từ các đơn hàng thực tế (DailyAggregate &amp; CSDL Commerce)
            </p>
          </div>

          {/* Search box */}
          <div className="relative shrink-0 w-full sm:w-60">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo Store ID, tên shop..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Grouped Data Table */}
        <div className="mt-3">
          <GroupedDataTable<StoreGmvRow>
            columns={columns}
            data={filteredRows}
            keyField="id"
            emptyTitle="Không có gian hàng phát sinh GMV"
            emptyMessage="Không tìm thấy gian hàng nào có dữ liệu giao dịch trong khoảng thời gian này."
            emptyIcon="storefront"
            expandable={true}
            expandedRowKeys={expandedKeys}
            onExpandedRowsChange={setExpandedKeys}
            expandedRowRender={renderStoreDetail}
            pagination={{
              currentPage,
              totalItems: filteredRows.length,
              pageSize: 10,
              onPageChange: setCurrentPage,
              itemLabel: 'gian hàng',
            }}
          />
        </div>

        {/* Grand Total Footer Summary */}
        {filteredRows.length > 0 && (
          <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">
                calculate
              </span>
              <span className="font-bold text-gray-900">
                Tổng Cộng Toàn Sàn ({filteredRows.length} gian hàng):
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-500 text-[11px]">Tổng Đơn: </span>
                <strong className="text-gray-900 font-mono">
                  {grandTotalOrders.toLocaleString('vi-VN')}
                </strong>
              </div>

              <div>
                <span className="text-gray-500 text-[11px]">Tổng GMV: </span>
                <strong className="text-emerald-700 font-editorial font-bold">
                  {formatVND(grandTotalGmv)}
                </strong>
              </div>

              <div>
                <span className="text-gray-500 text-[11px]">Hoa Hồng Thu Sàn: </span>
                <strong className="text-indigo-700 font-mono font-bold">
                  {formatVND(grandTotalCommission)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TopSellersTable;
