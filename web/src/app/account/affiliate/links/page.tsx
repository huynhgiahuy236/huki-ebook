"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';

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
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [links, setLinks] = useState<AffiliateLinkItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('');

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

  return (
    <AccountLayout>
      <div className="w-full space-y-6 font-sans p-2 sm:p-4">
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

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Tìm theo mã rút gọn, chiến dịch, URL..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-medium pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Lọc loại trang đích"
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">Tất cả loại trang đích</option>
              <option value="BOOK">Sách chi tiết</option>
              <option value="STORE">Gian hàng (Shop)</option>
              <option value="CATEGORY">Danh mục sách</option>
              <option value="HOME">Trang chủ sàn</option>
            </select>
          </div>
        </div>

        {/* Links Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Mã rút gọn &amp; Link</th>
                  <th className="p-3.5">Trang đích</th>
                  <th className="p-3.5">Chiến dịch / Sub-ID</th>
                  <th className="p-3.5 text-center">Lượt nhấp (Clicks)</th>
                  <th className="p-3.5 text-center">Chuyển đổi (Orders)</th>
                  <th className="p-3.5">Ngày tạo</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                        <span className="font-semibold text-xs">Đang tải danh sách liên kết...</span>
                      </div>
                    </td>
                  </tr>
                ) : links.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <span className="material-symbols-outlined text-4xl text-slate-300">link_off</span>
                        <p className="text-sm font-bold text-slate-800">Chưa có liên kết nào</p>
                        <p className="text-xs text-slate-500">
                          Bắt đầu tạo liên kết tiếp thị đầu tiên để chia sẻ tới độc giả và nhận hoa hồng.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  links.map((link) => (
                    <tr key={link.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
                            {link.shortCode}
                          </span>
                          <p className="text-[11px] text-slate-500 font-mono truncate max-w-[160px]">
                            {link.shortUrl}
                          </p>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1 max-w-xs">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 inline-block">
                            {link.targetType === 'BOOK'
                              ? 'Sách'
                              : link.targetType === 'STORE'
                              ? 'Shop'
                              : link.targetType === 'CATEGORY'
                              ? 'Danh mục'
                              : 'Trang chủ'}
                          </span>
                          <p className="text-slate-800 font-medium truncate text-xs" title={link.originalUrl}>
                            {link.originalUrl}
                          </p>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 block">
                            {link.campaignName || '—'}
                          </span>
                          {link.subId && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              Sub: {link.subId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-black text-slate-900 text-sm">
                          {link.clickCount.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-black text-emerald-800 text-sm">
                          {link.conversionCount.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(link.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(link.shortUrl)}
                            title="Sao chép liên kết"
                            className="p-1.5 text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrModalLink(link)}
                            title="Xem mã QR"
                            className="p-1.5 text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">qr_code</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
              <span>
                Trang {page} / {totalPages} (Tổng số {total} liên kết)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
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
                <div className="w-48 h-48 bg-white p-3 rounded-xl border border-slate-300 flex flex-col items-center justify-center space-y-2 shadow-inner">
                  <span className="material-symbols-outlined text-6xl text-emerald-800">qr_code_2</span>
                  <span className="font-mono text-[10px] text-slate-600 break-all px-2 text-center">
                    /r/{qrModalLink.shortCode}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                Quét mã QR để mở trực tiếp liên kết tiếp thị trên điện thoại hoặc chèn vào hình ảnh ấn phẩm.
              </p>

              <button
                type="button"
                onClick={() => setQrModalLink(null)}
                className="w-full py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl"
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
