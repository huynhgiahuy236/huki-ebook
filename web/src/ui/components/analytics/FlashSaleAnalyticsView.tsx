"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import GroupedDataTable, { type Column } from '../common/GroupedDataTable';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

export interface FlashSaleItemRecord {
  id: string;
  flashSaleId: string;
  flashSaleName?: string;
  storeId?: string;
  storeName?: string;
  bookId: string;
  bookTitle?: string;
  bookSlug?: string;
  coverUrl?: string;
  author?: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  discountPercent: number;
  stock: number;
  sold: number;
  soldPercent: number;
  isSoldOut?: boolean;
  revenue: number;
  subsidy: number;
  format?: string;
}

export interface FlashSaleCampaignGroup {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ENDED' | 'SCHEDULED' | 'CANCELLED';
  scope: 'PLATFORM' | 'SHOP';
  startsAt: string;
  endsAt: string;
  discountPercent: number;
  participatingStoresCount: number;
  totalItems: number;
  totalStock: number;
  totalSold: number;
  sellOutRate: number;
  totalRevenue: number;
  totalSubsidy: number;
  items: FlashSaleItemRecord[];
}

function formatVND(val: number | string | null | undefined): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num) || num === null || num === undefined) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function FlashSaleAnalyticsView() {
  const { showToast } = useToast();

  const [campaigns, setCampaigns] = useState<FlashSaleCampaignGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED' | 'SCHEDULED'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'PLATFORM' | 'SHOP'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([]);

  // Metadata store cache
  const [storeNamesMap, setStoreNamesMap] = useState<Map<string, string>>(new Map());

  // Load store names for reference
  useEffect(() => {
    let mounted = true;
    adminApi
      .getBusinesses({ limit: 100 })
      .then((res) => {
        if (!mounted || !res.success || !Array.isArray(res.data)) return;
        const nameMap = new Map<string, string>();
        res.data.forEach((b: any) => {
          if (Array.isArray(b.stores)) {
            b.stores.forEach((s: any) => {
              if (s.id && s.name) {
                nameMap.set(s.id, s.name);
              }
            });
          }
        });
        setStoreNamesMap(nameMap);
      })
      .catch((err) => console.warn('[FlashSaleAnalyticsView] Could not load store names:', err));

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch all Flash Sale campaigns from backend API
  const fetchFlashSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/flash-sales?limit=100');
      if (!res.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi ${res.status}`);
      }
      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : json.data?.items || json.items || [];

      const mapped: FlashSaleCampaignGroup[] = rawList.map((fs: any) => {
        const rawItems = Array.isArray(fs.items) ? fs.items : [];
        let campaignRevenue = 0;
        let campaignSubsidy = 0;
        let campaignStock = 0;
        let campaignSold = 0;

        const enrichedItems: FlashSaleItemRecord[] = rawItems.map((item: any) => {
          const sold = Number(item.sold || 0);
          const stock = Number(item.stock || 0);
          const originalPrice = Number(item.originalPrice || 0);
          const salePrice = Number(item.salePrice || 0);
          const discount = Math.max(0, originalPrice - salePrice);
          const revenue = sold * salePrice;
          const subsidy = sold * discount;

          campaignRevenue += revenue;
          campaignSubsidy += subsidy;
          campaignStock += stock;
          campaignSold += sold;

          const storeName =
            (item.storeId && storeNamesMap.get(item.storeId)) ||
            (item.storeName) ||
            'Gian Hàng HuKi';

          return {
            id: item.id || `fsi-${Math.random()}`,
            flashSaleId: fs.id,
            flashSaleName: fs.name,
            storeId: item.storeId,
            storeName,
            bookId: item.bookId,
            bookTitle: item.bookTitle || 'Sách Chưa Đặt Tên',
            bookSlug: item.bookSlug,
            coverUrl: item.coverUrl,
            author: item.author || 'Tác giả HuKi',
            originalPrice,
            salePrice,
            discount,
            discountPercent: Number(item.discountPercent || (originalPrice > 0 ? Math.round((discount / originalPrice) * 100) : 0)),
            stock,
            sold,
            soldPercent: stock > 0 ? Math.min(100, Math.round((sold / stock) * 100)) : 0,
            revenue,
            subsidy,
            format: item.format || 'PHYSICAL',
          };
        });

        const sellOutRate = campaignStock > 0 ? (campaignSold / campaignStock) * 100 : 0;

        return {
          id: fs.id,
          name: fs.name || 'Chiến Dịch Flash Sale',
          description: fs.description,
          status: fs.status || 'ENDED',
          scope: fs.scope || 'PLATFORM',
          startsAt: fs.startsAt,
          endsAt: fs.endsAt,
          discountPercent: Number(fs.discountPercent || 30),
          participatingStoresCount: Number(fs.participatingStoresCount || (fs.storeId ? 1 : 0)),
          totalItems: enrichedItems.length,
          totalStock: campaignStock,
          totalSold: campaignSold,
          sellOutRate,
          totalRevenue: campaignRevenue,
          totalSubsidy: campaignSubsidy,
          items: enrichedItems,
        };
      });

      // Sort: ACTIVE first, then SCHEDULED, then ENDED by startsAt desc
      mapped.sort((a, b) => {
        const order = { ACTIVE: 1, SCHEDULED: 2, ENDED: 3, CANCELLED: 4 };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      });

      setCampaigns(mapped);
    } catch (err: any) {
      console.error('[FlashSaleAnalyticsView] Fetch error:', err);
      setError(err.message || 'Không thể tải dữ liệu phân tích Flash Sale');
    } finally {
      setLoading(false);
    }
  }, [storeNamesMap]);

  useEffect(() => {
    fetchFlashSales();
  }, [fetchFlashSales]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (scopeFilter !== 'ALL' && c.scope !== scopeFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = c.name.toLowerCase().includes(term);
        const matchItem = c.items.some((it) => (it.bookTitle || '').toLowerCase().includes(term));
        if (!matchName && !matchItem) return false;
      }
      return true;
    });
  }, [campaigns, statusFilter, scopeFilter, searchTerm]);

  // Overall Statistics Metrics
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalSold = 0;
    let totalStock = 0;
    let totalSubsidy = 0;

    campaigns.forEach((c) => {
      totalRevenue += c.totalRevenue;
      totalSold += c.totalSold;
      totalStock += c.totalStock;
      totalSubsidy += c.totalSubsidy;
    });

    const avgSellOutRate = totalStock > 0 ? (totalSold / totalStock) * 100 : 0;

    return {
      totalRevenue,
      totalSold,
      totalStock,
      totalSubsidy,
      avgSellOutRate,
      activeCampaignsCount: campaigns.filter((c) => c.status === 'ACTIVE').length,
    };
  }, [campaigns]);

  // Columns for GroupedDataTable
  const columns: Column<FlashSaleCampaignGroup>[] = useMemo(
    () => [
      {
        key: 'name',
        title: 'Đợt Flash Sale & Khung Giờ',
        render: (_, row) => (
          <div className="flex flex-col gap-1 max-w-[280px] sm:max-w-[340px]">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-xs">
              <span className="material-symbols-outlined text-amber-500 text-[18px] shrink-0">
                bolt
              </span>
              <span className="truncate" title={row.name}>
                {row.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
              <span className="material-symbols-outlined text-[13px] text-gray-400">schedule</span>
              <span>{formatDateTime(row.startsAt)}</span>
              <span>→</span>
              <span>{formatDateTime(row.endsAt)}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'scope',
        title: 'Quy Mô',
        align: 'center',
        width: 110,
        render: (_, row) => (
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
              row.scope === 'PLATFORM'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}
          >
            {row.scope === 'PLATFORM' ? 'Toàn Sàn' : 'Shop Riêng'}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'center',
        width: 130,
        render: (_, row) => {
          if (row.status === 'ACTIVE') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Đang Diễn Ra
              </span>
            );
          }
          if (row.status === 'SCHEDULED') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10.5px] font-bold border border-amber-200">
                <span className="material-symbols-outlined text-[13px]">alarm</span>
                Sắp Bắt Đầu
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10.5px] font-bold border border-gray-200">
              Đã Kết Thúc
            </span>
          );
        },
      },
      {
        key: 'participatingStoresCount',
        title: 'Gian Hàng',
        align: 'center',
        width: 90,
        render: (_, row) => (
          <span className="font-mono text-xs font-bold text-gray-800">
            {row.participatingStoresCount > 0 ? row.participatingStoresCount : 1}
          </span>
        ),
      },
      {
        key: 'totalItems',
        title: 'Số SKU',
        align: 'center',
        width: 80,
        render: (_, row) => (
          <span className="font-mono text-xs font-bold text-gray-800">
            {row.totalItems}
          </span>
        ),
      },
      {
        key: 'sellOutRate',
        title: 'Tỷ Lệ Bán Hết',
        align: 'right',
        width: 140,
        render: (_, row) => (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-xs font-bold">
              <span className="text-emerald-700">{row.totalSold}</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">{row.totalStock} cuốn</span>
              <span className="text-gray-400 text-[10.5px]">({row.sellOutRate.toFixed(1)}%)</span>
            </div>
            <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  row.sellOutRate >= 80 ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(row.sellOutRate, 100)}%` }}
              />
            </div>
          </div>
        ),
      },
      {
        key: 'totalRevenue',
        title: 'Doanh Thu Đợt',
        align: 'right',
        render: (_, row) => (
          <span className="font-editorial font-extrabold text-xs text-gray-900">
            {formatVND(row.totalRevenue)}
          </span>
        ),
      },
      {
        key: 'totalSubsidy',
        title: 'Giảm Giá Tài Trợ',
        align: 'right',
        render: (_, row) => (
          <span className="font-mono text-xs font-semibold text-rose-600">
            {formatVND(row.totalSubsidy)}
          </span>
        ),
      },
    ],
    []
  );

  // Render Sub-Table for Child Rows (Books inside each campaign)
  const renderCampaignDetail = useCallback((campaign: FlashSaleCampaignGroup) => {
    return (
      <div className="flex flex-col gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200 my-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[20px]">
              local_offer
            </span>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Danh sách {campaign.items.length} đầu sách trong đợt: {campaign.name}
            </h4>
          </div>
          <div className="text-[11px] text-gray-500">
            Doanh thu đợt: <strong className="text-emerald-700 font-editorial font-bold">{formatVND(campaign.totalRevenue)}</strong> | 
            Đã bán: <strong className="text-gray-800 font-mono">{campaign.totalSold} / {campaign.totalStock}</strong>
          </div>
        </div>

        {campaign.items.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            Chưa có đầu sách nào được đăng ký trong đợt Flash Sale này.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs divide-y divide-gray-100">
              <thead className="bg-gray-50 text-[10.5px] uppercase font-bold text-gray-500 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Tựa Sách &amp; Tác Giả</th>
                  <th className="py-2.5 px-3">Gian Hàng</th>
                  <th className="py-2.5 px-3 text-right">Giá Gốc</th>
                  <th className="py-2.5 px-3 text-right">Giá Flash Sale</th>
                  <th className="py-2.5 px-3 text-right">Đã Bán / Slot Kho</th>
                  <th className="py-2.5 px-3 text-right">Tỷ Lệ Hết</th>
                  <th className="py-2.5 px-3 text-right">Doanh Thu Thu Về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {campaign.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Book Info */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5 max-w-[280px]">
                        {it.coverUrl ? (
                          <img
                            src={it.coverUrl}
                            alt={it.bookTitle}
                            className="w-8 h-11 object-cover rounded shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-11 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px] text-gray-400">menu_book</span>
                          </div>
                        )}
                        <div className="flex flex-col truncate">
                          <span className="font-bold text-gray-900 truncate" title={it.bookTitle}>
                            {it.bookTitle}
                          </span>
                          <span className="text-[10.5px] text-gray-500 truncate" title={it.author}>
                            {it.author} • <span className="font-semibold text-gray-700">{it.format}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Store */}
                    <td className="py-2.5 px-3 text-gray-700 font-medium">
                      <div className="flex items-center gap-1 max-w-[160px] truncate" title={it.storeName}>
                        <span className="material-symbols-outlined text-[14px] text-gray-400">storefront</span>
                        <span className="truncate">{it.storeName}</span>
                      </div>
                    </td>

                    {/* Original Price */}
                    <td className="py-2.5 px-3 text-right text-gray-400 line-through">
                      {formatVND(it.originalPrice)}
                    </td>

                    {/* Sale Price */}
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700 font-editorial">
                      {formatVND(it.salePrice)}
                      <span className="ml-1 text-[10px] text-rose-600 bg-rose-50 px-1 py-0.5 rounded font-black">
                        -{it.discountPercent}%
                      </span>
                    </td>

                    {/* Sold / Stock */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                      {it.sold} / {it.stock}
                    </td>

                    {/* Sell-out % */}
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-[11px] font-bold ${
                          it.soldPercent >= 100
                            ? 'text-rose-600'
                            : it.soldPercent >= 70
                            ? 'text-emerald-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {it.soldPercent}%
                      </span>
                    </td>

                    {/* Revenue */}
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 font-editorial">
                      {formatVND(it.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }, []);

  // Export CSV Handler
  const handleExportCsv = () => {
    if (campaigns.length === 0) {
      showToast('Chưa có dữ liệu Flash Sale để xuất CSV', 'info');
      return;
    }

    const headers = [
      'ID Chiến Dịch',
      'Tên Đợt Flash Sale',
      'Trạng Thái',
      'Quy Mô',
      'Bắt Đầu',
      'Kết Thúc',
      'Số Gian Hàng',
      'Số SKU',
      'Tổng Slot Kho',
      'Đã Bán',
      'Tỷ Lệ Hết (%)',
      'Doanh Thu Đợt (VNĐ)',
      'Tài Trợ Giảm Giá (VNĐ)',
    ];

    const rows = filteredCampaigns.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.status,
      c.scope,
      c.startsAt,
      c.endsAt,
      c.participatingStoresCount,
      c.totalItems,
      c.totalStock,
      c.totalSold,
      c.sellOutRate.toFixed(1),
      c.totalRevenue,
      c.totalSubsidy,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HUKI_Bao_Cao_Flash_Sale_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống tệp thống kê Flash Sale (CSV)', 'success');
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* 1. TOP FLASH SALE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Flash Sale GMV */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Doanh Thu Flash Sale
              </span>
              <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-editorial text-gray-900 mt-2">
              {formatVND(summaryMetrics.totalRevenue)}
            </div>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
            <span className="text-emerald-700 font-bold">100% dữ liệu thực</span>
            <span>từ các đợt Flash Sale</span>
          </div>
        </div>

        {/* KPI 2: Sold Units */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Số Lượng Đã Bán
              </span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-editorial text-gray-900 mt-2">
              {summaryMetrics.totalSold.toLocaleString('vi-VN')} cuốn
            </div>
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            Trên tổng số <strong>{summaryMetrics.totalStock.toLocaleString('vi-VN')}</strong> slot phân bổ
          </div>
        </div>

        {/* KPI 3: Sell-out Rate */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Tỷ Lệ Bán Hết Bình Quân
              </span>
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">percent</span>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-editorial text-emerald-700 mt-2">
              {summaryMetrics.avgSellOutRate.toFixed(1)}%
            </div>
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            Hiệu suất thanh lý slot kho trong các khung giờ
          </div>
        </div>

        {/* KPI 4: Total Subsidy */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Tổng Giảm Giá Tài Trợ
              </span>
              <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">price_check</span>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-editorial text-rose-600 mt-2">
              {formatVND(summaryMetrics.totalSubsidy)}
            </div>
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            Chiết khấu người bán + Hỗ trợ giá từ sàn HuKi
          </div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR & ACTION HEADER */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-gray-500 mr-1">Trạng thái đợt:</span>
          {[
            { id: 'ALL', label: 'Tất Cả' },
            { id: 'ACTIVE', label: 'Đang Diễn Ra' },
            { id: 'ENDED', label: 'Đã Kết Thúc' },
            { id: 'SCHEDULED', label: 'Sắp Diễn Ra' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#00875A] text-white shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scope selector, search & export */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Scope filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500">Quy mô:</span>
            <select
              value={scopeFilter}
              onChange={(e) => {
                setScopeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#00875A]"
            >
              <option value="ALL">Toàn Bộ Quy Mô</option>
              <option value="PLATFORM">Chỉ Flash Sale Toàn Sàn</option>
              <option value="SHOP">Chỉ Flash Sale Shop Riêng</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative shrink-0 w-full sm:w-56">
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
              placeholder="Tìm tên đợt, tựa sách..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00875A] focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchFlashSales()}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
            title="Tải lại dữ liệu Flash Sale"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin text-emerald-600' : ''}`}>
              refresh
            </span>
            <span>Làm Mới</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#00875A] hover:bg-[#00734c] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
            title="Xuất tệp CSV báo cáo Flash Sale"
          >
            <span className="material-symbols-outlined text-[16px]">csv</span>
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchFlashSales()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] hover:bg-rose-700 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 3. GROUPED DATA TABLE: FLASH SALE CAMPAIGNS & SLOTS */}
      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[22px]">
                electric_bolt
              </span>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 font-editorial">
                Bảng Thống Kê Chi Tiết Từng Đợt Flash Sale
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10.5px] font-bold border border-amber-200">
                {filteredCampaigns.length} đợt
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Bấm vào mũi tên đầu dòng để mở rộng xem từng SKU sách, gian hàng và doanh thu cụ thể
            </p>
          </div>
        </div>

        <GroupedDataTable<FlashSaleCampaignGroup>
          columns={columns}
          data={filteredCampaigns}
          keyField="id"
          loading={loading}
          emptyTitle="Chưa có dữ liệu Flash Sale"
          emptyMessage="Không tìm thấy chiến dịch Flash Sale nào khớp với bộ lọc hiện tại."
          emptyIcon="bolt"
          expandable={true}
          expandedRowKeys={expandedKeys}
          onExpandedRowsChange={setExpandedKeys}
          expandedRowRender={renderCampaignDetail}
          pagination={{
            currentPage,
            totalItems: filteredCampaigns.length,
            pageSize: 10,
            onPageChange: setCurrentPage,
            itemLabel: 'chiến dịch',
          }}
        />

        {/* Grand Total Footer Summary */}
        {filteredCampaigns.length > 0 && (
          <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">
                calculate
              </span>
              <span className="font-bold text-gray-900">
                Tổng Kết Danh Sách Hiển Thị ({filteredCampaigns.length} đợt):
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-500 text-[11px]">Tổng Đã Bán: </span>
                <strong className="text-gray-900 font-mono">
                  {filteredCampaigns.reduce((sum, c) => sum + c.totalSold, 0).toLocaleString('vi-VN')} cuốn
                </strong>
              </div>

              <div>
                <span className="text-gray-500 text-[11px]">Tổng Doanh Thu Flash Sale: </span>
                <strong className="text-emerald-700 font-editorial font-bold">
                  {formatVND(filteredCampaigns.reduce((sum, c) => sum + c.totalRevenue, 0))}
                </strong>
              </div>

              <div>
                <span className="text-gray-500 text-[11px]">Tổng Trợ Giá: </span>
                <strong className="text-rose-600 font-mono font-bold">
                  {formatVND(filteredCampaigns.reduce((sum, c) => sum + c.totalSubsidy, 0))}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashSaleAnalyticsView;
