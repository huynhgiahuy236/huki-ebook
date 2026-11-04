"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import { useAffiliateGuard } from '@/lib/affiliate/useAffiliateGuard';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';
import { DataTableFilterBar, BulkActionGroup } from '@/ui/components/common';

interface AffiliateLinkItem {
  id: string;
  profileId: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  targetType: string;
  campaignName: string | null;
  subId: string | null;
  clickCount: number;
  conversionCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function AffiliateLinksPage() {
  const { isLoading: guardLoading } = useAffiliateGuard({ enforceActive: true });
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [links, setLinks] = useState<AffiliateLinkItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modal Create Link State
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [form, setForm] = useState<{
    targetUrl: string;
    customShortCode: string;
    campaignName: string;
    subId: string;
  }>({
    targetUrl: '',
    customShortCode: '',
    campaignName: '',
    subId: '',
  });

  // QR Modal State
  const [qrModalLink, setQrModalLink] = useState<AffiliateLinkItem | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await affiliateApi.listMyAffiliateLinks({
        page,
        limit: 10,
        search: search.trim() || undefined,
        targetType: targetTypeFilter || undefined,
      });

      if (res.success && res.data) {
        setLinks(res.data.items || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi tải liên kết',
        message: err.message || 'Không thể tải danh sách liên kết tiếp thị.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, targetTypeFilter, showToast]);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      loadLinks();
    }
  }, [authLoading, isLoggedIn, loadLinks]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetUrl.trim()) {
      showToast({
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đường dẫn trang đích (Target URL).',
      });
      return;
    }

    setCreating(true);
    try {
      const res = await affiliateApi.createAffiliateLink({
        targetUrl: form.targetUrl.trim(),
        customShortCode: form.customShortCode.trim() || undefined,
        campaignName: form.campaignName.trim() || undefined,
        subId: form.subId.trim() || undefined,
      });

      if (res.success && res.data) {
        showToast({
          type: 'success',
          title: 'Tạo liên kết thành công',
          message: `Mã rút gọn: ${res.data.shortCode}`,
        });
        setCreateModalOpen(false);
        setForm({ targetUrl: '', customShortCode: '', campaignName: '', subId: '' });
        loadLinks();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Không thể tạo liên kết',
        message: err.message || 'Lỗi hệ thống khi tạo liên kết tiếp thị.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (shortUrl: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://huki.vn';
    const fullUrl = `${origin}${shortUrl}`;
    navigator.clipboard.writeText(fullUrl);
    showToast({
      type: 'success',
      title: 'Đã sao chép liên kết',
      message: 'Liên kết tiếp thị đã được sao chép vào bộ nhớ tạm.',
    });
  };


  const linkBulkActionGroups: BulkActionGroup[] = [
    {
      groupLabel: 'XUẤT DỮ LIỆU',
      actions: [
        { value: 'EXPORT_CSV', label: 'Xuất danh sách liên kết (.csv)' },
      ],
    },
  ];

  const handleExecuteBulkAction = async (actionId: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionId === 'EXPORT_CSV') {
        const selected = links.filter((l) => selectedIds.includes(l.id));
        const headers = ['Mã Rút Gọn', 'Link Rút Gọn', 'URL Gốc', 'Loại Trang Đích', 'Chiến Dịch', 'Sub ID', 'Lượt Nhấp', 'Chuyển Đổi', 'Ngày Tạo'];
        const rows = selected.map((l) => [
          `"${l.shortCode}"`,
          `"${l.shortUrl}"`,
          `"${l.originalUrl.replace(/"/g, '""')}"`,
          `"${l.targetType}"`,
          `"${l.campaignName || ''}"`,
          `"${l.subId || ''}"`,
          l.clickCount,
          l.conversionCount,
          `"${new Date(l.createdAt).toLocaleDateString('vi-VN')}"`,
        ]);
        const csvContent = '﻿' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Lien_Ket_Tiep_Thi_HuKi_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast({ title: 'Xuất file thành công', message: `Đã xuất ${selected.length} liên kết tiếp thị.` }, 'success');
      }
    } catch {
      showToast({ title: 'Lỗi', message: 'Không thể xuất file' }, 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const linkColumns: Column<AffiliateLinkItem>[] = useMemo(
    () => [
      {
        key: 'shortCode',
        title: 'Mã & Link Tiếp Thị',
        width: 200,
        render: (_val, link) => (
          <div className="py-1 space-y-1">
            <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 inline-block text-xs">
              /r/{link.shortCode}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-mono break-all leading-tight">
                {link.shortUrl}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(link.shortUrl);
                }}
                className="text-slate-400 hover:text-emerald-700 p-0.5 transition-colors cursor-pointer shrink-0"
                title="Sao chép link"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
            </div>
          </div>
        ),
      },
      {
        key: 'target',
        title: 'Trang Đích & Phân Loại',
        minWidth: 240,
        render: (_val, link) => (
          <div className="py-1 space-y-1">
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 inline-block border border-slate-200">
              {link.targetType === 'BOOK'
                ? 'Sách Chi Tiết'
                : link.targetType === 'STORE'
                ? 'Gian Hàng Shop'
                : link.targetType === 'CATEGORY'
                ? 'Danh Mục Sách'
                : 'Trang Chủ Sàn'}
            </span>
            <p
              className="text-slate-800 font-medium text-xs break-words line-clamp-2 leading-snug"
              title={link.originalUrl}
            >
              {link.originalUrl}
            </p>
          </div>
        ),
      },
      {
        key: 'campaign',
        title: 'Chiến Dịch & Phụ Hiệu',
        width: 170,
        render: (_val, link) => (
          <div className="py-1 text-xs space-y-0.5">
            <span className="font-semibold text-slate-800 block truncate" title={link.campaignName || '—'}>
              {link.campaignName || 'Mặc định'}
            </span>
            {link.subId && (
              <span className="text-[10.5px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono inline-block">
                Sub: {link.subId}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'performance',
        title: 'Hiệu Suất (Click / Đơn)',
        width: 170,
        align: 'center',
        render: (_val, link) => {
          const cr = link.clickCount > 0 ? ((link.conversionCount / link.clickCount) * 100).toFixed(1) : '0';
          return (
            <div className="py-1 text-xs text-center space-y-0.5">
              <div className="flex items-center justify-center gap-2">
                <span className="font-black text-slate-900">{link.clickCount.toLocaleString('vi-VN')} clicks</span>
                <span className="text-slate-300">•</span>
                <span className="font-black text-emerald-800">{link.conversionCount.toLocaleString('vi-VN')} đơn</span>
              </div>
              <span className="text-[10.5px] text-slate-400 font-semibold block">
                Tỷ lệ CR: <strong className="text-emerald-700">{cr}%</strong>
              </span>
            </div>
          );
        },
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 130,
        align: 'right',
        render: (_val, link) => (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => handleCopy(link.shortUrl)}
              title="Sao chép link"
              className="p-1.5 text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
            </button>
            <button
              type="button"
              onClick={() => setQrModalLink(link)}
              title="Xem mã QR"
              className="p-1.5 text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
            </button>
            <a
              href={link.originalUrl}
              target="_blank"
              rel="noreferrer"
              title="Mở trang đích"
              className="p-1.5 text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </a>
          </div>
        ),
      },
    ],
    []
  );

  const renderExpandedLinkDetail = (link: AffiliateLinkItem) => {
    const cr = link.clickCount > 0 ? ((link.conversionCount / link.clickCount) * 100).toFixed(1) : '0';
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-white rounded-xl p-4 border border-emerald-200/80 shadow-2xs text-xs">
        {/* Card 1: Thông tin URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-100 pb-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#00875A]">link</span>
            <span>Chi Tiết Đường Dẫn</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[10.5px]">Link rút gọn bảo mật:</span>
              <span className="font-mono font-bold text-emerald-800">{link.shortUrl}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10.5px]">Trang đích nguyên bản:</span>
              <p className="font-medium text-slate-800 break-words leading-snug text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                {link.originalUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Hiệu suất & Phụ hiệu */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-100 pb-1.5">
            <span className="material-symbols-outlined text-[15px] text-amber-600">analytics</span>
            <span>Hiệu Suất Tiếp Thị</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Chiến dịch:</span>
              <span className="font-semibold text-slate-900">{link.campaignName || 'Mặc định'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mã Sub-ID theo dõi:</span>
              <span className="font-mono text-slate-800">{link.subId || 'Không gắn'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lượt click hợp lệ:</span>
              <span className="font-bold text-slate-900">{link.clickCount.toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Đơn hàng thành công:</span>
              <span className="font-bold text-emerald-800">{link.conversionCount.toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-bold">Tỷ lệ chuyển đổi:</span>
              <span className="font-black text-emerald-700">{cr}%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Thao tác & Mã QR */}
        <div className="space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-100 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-blue-600">qr_code</span>
              <span>Chia Sẻ &amp; Lan Tỏa</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Tạo mã QR hoặc chia sẻ link lên Facebook, TikTok, Blog hoặc gửi trực tiếp cho độc giả để nhận hoa hồng tự động.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleCopy(link.shortUrl)}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
              <span>Copy Link</span>
            </button>
            <button
              type="button"
              onClick={() => setQrModalLink(link)}
              className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
              <span>Mở Mã QR</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

    return (
    <AccountLayout>
      <div className="w-full max-w-full min-w-0 overflow-hidden space-y-6 font-sans p-2 sm:p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-800 text-2xl">link</span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Quản Lý Liên Kết Tiếp Thị (Affiliate Links)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tạo và quản lý các liên kết chia sẻ, theo dõi số lượt nhấp chuột và tỷ lệ chuyển đổi đơn hàng.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-base">add_link</span>
            <span>Tạo liên kết mới</span>
          </button>
        </div>

        {/* Standard Multi-Tier Filter & Bulk Actions Bar */}
        <DataTableFilterBar
          searchQuery={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Tìm theo mã rút gọn, chiến dịch, URL..."
          extraFilters={
            <select
              aria-label="Lọc loại trang đích"
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">Mọi Loại Trang Đích</option>
              <option value="BOOK">Sách Chi Tiết</option>
              <option value="STORE">Gian Hàng Shop</option>
              <option value="CATEGORY">Danh Mục Sách</option>
              <option value="HOME">Trang Chủ Sàn</option>
            </select>
          }
          bulkActionGroups={linkBulkActionGroups}
          selectedCount={selectedIds.length}
          totalCount={links.length}
          onExecuteBulkAction={handleExecuteBulkAction}
          onClearSelection={() => setSelectedIds([])}
          bulkLoading={bulkLoading}
          itemName="liên kết"
          className="mb-4"
        />

        {/* Grouped Data Table Standardized */}
        <div className="w-full max-w-full overflow-x-auto min-w-0 rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <GroupedDataTable<AffiliateLinkItem>
          columns={linkColumns}
          data={links}
          keyField="id"
          loading={loading || guardLoading}
          selectable={true}
          selectedRowKeys={selectedIds}
          onSelectionChange={(keys) => setSelectedIds(keys as string[])}
          expandable={true}
          expandedRowRender={renderExpandedLinkDetail}
          emptyTitle="Chưa có liên kết tiếp thị nào"
          emptyMessage={
            search
              ? `Không tìm thấy liên kết khớp với từ khóa "${search}"`
              : 'Bắt đầu tạo liên kết tiếp thị đầu tiên để chia sẻ tới độc giả và nhận hoa hồng.'
          }
          emptyIcon="link_off"
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: total,
            pageSize: 10,
            onPageChange: setPage,
            itemLabel: 'liên kết',
          }}
          className="w-full"
        />
        </div>

        {/* MODAL: CREATE LINK */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Tạo liên kết tiếp thị mới</h3>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateLink} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Đường dẫn trang đích (Target URL) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: /book/kinh-te-hoc hoặc https://huki.vn/shop/alpha"
                    value={form.targetUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, targetUrl: e.target.value }))}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Hỗ trợ trang chi tiết sách, gian hàng, danh mục hoặc trang chủ sàn.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mã rút gọn tùy chỉnh (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: sachhot_tet2027 (Để trống hệ thống tự sinh)"
                    value={form.customShortCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, customShortCode: e.target.value }))}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tên chiến dịch (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Facebook_Reels_Thang10"
                    value={form.campaignName}
                    onChange={(e) => setForm((prev) => ({ ...prev, campaignName: e.target.value }))}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Thẻ theo dõi phụ Sub-ID (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: bio_link_tiktok"
                    value={form.subId}
                    onChange={(e) => setForm((prev) => ({ ...prev, subId: e.target.value }))}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creating && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>{creating ? 'Đang tạo...' : 'Tạo liên kết'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: QR CODE */}
        {qrModalLink && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-black text-slate-900">Mã QR Chia Sẻ Tiếp Thị</h3>
                <button
                  type="button"
                  onClick={() => setQrModalLink(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                {/* Clean inline SVG QR Placeholder with direct scan URL */}
                <div className="flex flex-col items-center justify-center space-y-2.5">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                      typeof window !== 'undefined' ? `${window.location.origin}/r/${qrModalLink.shortCode}` : `https://huki.vn/r/${qrModalLink.shortCode}`
                    )}&margin=10`}
                    alt="QR Code"
                    className="w-48 h-48 rounded-xl bg-white p-2 border border-slate-200 shadow-sm object-contain"
                  />
                  <span className="font-mono text-[11px] text-slate-700 font-semibold break-all px-2 text-center">
                    /r/{qrModalLink.shortCode}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                Quét mã QR để mở trực tiếp liên kết tiếp thị trên điện thoại hoặc chèn vào hình ảnh ấn phẩm.
              </p>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
                  typeof window !== 'undefined' ? `${window.location.origin}/r/${qrModalLink.shortCode}` : `https://huki.vn/r/${qrModalLink.shortCode}`
                )}&margin=15`}
                download={`huki-qr-${qrModalLink.shortCode}.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Tải Ảnh QR Sắc Nét (PNG 1000px)</span>
              </a>
              <button
                type="button"
                onClick={() => setQrModalLink(null)}
                className="w-full py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
