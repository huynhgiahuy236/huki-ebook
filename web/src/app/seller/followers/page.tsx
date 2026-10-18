'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { businessApi, type FollowerItem } from '@/ui/api/businessApi';
import { getFollowerBadge } from '@/ui/api/sellerVoucherApi';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '@/ui/components/common';

const followerBulkActionGroups: BulkActionGroup[] = [
  {
    groupLabel: 'XUẤT DỮ LIỆU',
    actions: [
      { value: 'EXPORT_CSV', label: 'Xuất danh sách người theo dõi (.csv)' },
    ],
  },
];

function SellerFollowersContent() {
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();
  const businessId = user?.business?.id || activeBusinessId || undefined;

  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Search with 2-second debounce
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Debounce 2 seconds (2000ms)
  useEffect(() => {
    if (searchQuery === debouncedSearch) {
      setIsDebouncing(false);
      return undefined;
    }

    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setIsDebouncing(false);
      setPage(1);
    }, 2000);

    return () => clearTimeout(handler);
  }, [searchQuery, debouncedSearch]);

  // Fetch followers from Backend
  const fetchFollowers = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await businessApi.getBusinessFollowers(businessId, {
        page,
        limit: 10,
        search: debouncedSearch,
      });

      if (res.success && res.data) {
        setFollowers(res.data.items || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      } else {
        setFollowers([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.warn('Could not fetch followers:', err);
      showToast('Có lỗi khi tải danh sách người theo dõi', 'error');
      setFollowers([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, page, debouncedSearch, showToast]);

  const filteredFollowers = useMemo(() => {
    return followers.filter((f: FollowerItem) => matchesDateFilter(f.createdAt, dateFilter));
  }, [followers, dateFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFollowers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFollowers.map((f: FollowerItem) => f.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async (actionId: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionId === 'EXPORT_CSV') {
        const selected = followers.filter((f: FollowerItem) => selectedIds.includes(f.id));
        const headers = ['Mã Khách Hàng', 'Họ Và Tên', 'Số Điện Thoại', 'Ngày Theo Dõi', 'Trạng Thái'];
        const rows = selected.map((f: FollowerItem) => [
          f.customerCode || 'KH-HUKI',
          `"${(f.fullName || '').replace(/"/g, '""')}"`,
          `"${(f.phone || '').replace(/"/g, '""')}"`,
          f.createdAt || '',
          f.status || 'ACTIVE',
        ].join(','));
        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Nguoi_Theo_Doi_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Đã xuất danh sách người theo dõi thành công', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Thao tác thất bại', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* Breadcrumb & Title Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
            <Link href="/seller/dashboard" className="hover:text-[#006953] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">dashboard</span>
              <span>Kênh Người Bán</span>
            </Link>
            <span className="text-gray-300">/</span>
            <span className="font-bold text-[#006953]">Người Theo Dõi</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl text-[#006953]">groups</span>
            Quản Lý Người Theo Dõi
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Danh sách khách hàng và độc giả đang theo dõi gian hàng của bạn trên hệ thống HUKI.
          </p>
        </div>

        <button
          onClick={fetchFollowers}
          disabled={isLoading || isDebouncing}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs sm:text-sm font-bold text-gray-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
        >
          <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>Làm mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#006953] flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="material-symbols-outlined text-2xl">loyalty</span>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 block">Tổng Người Theo Dõi</span>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              {total.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 block">Tài Khoản Hoạt Động</span>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              {followers.filter((f) => f.status === 'ACTIVE').length.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <span className="material-symbols-outlined text-2xl">update</span>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 block">Quy Cách Phân Trang</span>
            <span className="text-sm font-bold text-gray-800 tracking-tight">
              10 người theo dõi / trang
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar with Search, Split Date Filter, and Integrated Bulk Actions */}
      <DataTableFilterBar
        searchPlaceholder="Tìm theo tên, SĐT, mã KH..."
        searchQuery={searchQuery}
        onSearchChange={(v: string) => {
          setSearchQuery(v);
        }}
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        dateFilter={dateFilter}
        onDateFilterChange={(v: DateFilterValue) => {
          setDateFilter(v);
        }}
        bulkActionGroups={followerBulkActionGroups}
        selectedCount={selectedIds.length}
        totalCount={filteredFollowers.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds([])}
        bulkLoading={bulkLoading}
        itemName="người theo dõi"
      />

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 pl-4 pr-1 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredFollowers.length && filteredFollowers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]"
                  />
                </th>
                <th className="py-3.5 px-5 whitespace-nowrap">Mã Khách Hàng</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Tên Khách Hàng</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Số Điện Thoại</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Huy Hiệu Gắn Bó</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Thời Gian Theo Dõi</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Trạng Thái</th>
                <th className="py-3.5 px-5 whitespace-nowrap text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <span className="inline-block w-7 h-7 border-3 border-[#006953]/20 border-t-[#006953] rounded-full animate-spin mb-2"></span>
                    <p className="text-xs text-gray-500 font-medium">Đang tải danh sách người theo dõi...</p>
                  </td>
                </tr>
              ) : filteredFollowers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-2xl">group_off</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 mb-1">
                      {debouncedSearch ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có người theo dõi nào'}
                    </p>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      {debouncedSearch
                        ? `Không có khách hàng nào khớp với từ khóa "${debouncedSearch}".`
                        : 'Khi khách hàng nhấn Theo dõi gian hàng của bạn, thông tin sẽ được hiển thị tại đây.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFollowers.map((item: FollowerItem) => {
                  const fullName = item.fullName || 'Khách Hàng';
                  const isLongName = fullName.length > 10;
                  const displayName = isLongName ? `${fullName.slice(0, 10)}...` : fullName;
                  const badgeInfo = getFollowerBadge(item.createdAt);
                  const followDate = new Date(item.createdAt);
                  const formattedDate = isNaN(followDate.getTime())
                    ? 'Chưa xác định'
                    : followDate.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      });

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/70 transition-colors group"
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 pl-4 pr-1 w-8 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectRow(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]"
                        />
                      </td>

                      {/* Cột 1: Mã khách hàng */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-gray-800 px-2 py-0.5 bg-gray-100 rounded-md border border-gray-200/60">
                          {item.customerCode || 'KH-HUKI'}
                        </span>
                      </td>

                      {/* Cột 2: Tên khách hàng (Avatar + Tên tối đa 10 ký tự có Tooltip) */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#006953]/10 text-[#006953] border border-[#006953]/20 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                            {item.avatar ? (
                              <img src={item.avatar} alt={fullName} className="w-full h-full object-cover" />
                            ) : (
                              fullName.charAt(0).toUpperCase()
                            )}
                          </div>

                          {/* Tên kèm Tooltip hiển thị đầy đủ */}
                          <div className="relative group/name inline-block">
                            <span
                              className="font-bold text-gray-900 cursor-default"
                              title={fullName}
                            >
                              {displayName}
                            </span>

                            {/* Tooltip nổi nếu tên dài > 10 ký tự */}
                            {isLongName && (
                              <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/name:block z-30 bg-gray-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in duration-100">
                                {fullName}
                                <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Số điện thoại */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-gray-700 font-medium">
                        {item.phone ? (
                          <span className="font-mono text-xs text-gray-800">{item.phone}</span>
                        ) : (
                          <span className="text-gray-400 italic">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* Cột 4: Huy hiệu Gắn Bó */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${badgeInfo.bgClass} ${badgeInfo.borderClass}`}>
                          <span className="material-symbols-outlined text-[14px]">{badgeInfo.icon}</span>
                          <span>{badgeInfo.badge}</span>
                        </span>
                      </td>

                      {/* Cột 5: Thời gian theo dõi */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-medium text-gray-800 text-xs">
                            {formattedDate}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {badgeInfo.days === 0 ? 'Mới theo dõi hôm nay' : `Đã theo dõi ${badgeInfo.days} ngày`}
                          </span>
                        </div>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {item.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Không hoạt động
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Thao tác (Nhắn tin - Tạm thời disabled) */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href="/seller/promotions/vouchers"
                            className="px-2.5 py-1.5 rounded-lg border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 font-bold text-xs flex items-center gap-1 transition-colors"
                            title="Tạo Voucher tri ân người theo dõi"
                          >
                            <span className="material-symbols-outlined text-sm">loyalty</span>
                            <span>Tặng Voucher</span>
                          </Link>
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 font-medium text-xs flex items-center gap-1 cursor-not-allowed select-none opacity-80"
                            title="Tính năng nhắn tin trực tiếp với khách hàng đang được phát triển (Sắp ra mắt)"
                          >
                            <span className="material-symbols-outlined text-sm">chat</span>
                            <span>Nhắn tin</span>
                            <span className="text-[9px] bg-gray-200 text-gray-600 px-1 py-0.2 rounded font-bold ml-0.5">
                              Sắp có
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/40">
            <span className="text-xs text-gray-500">
              Trang <strong>{page}</strong> trên tổng số <strong>{totalPages}</strong> trang ({total} người theo dõi)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Trang trước
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      page === p
                        ? 'bg-[#006953] text-white shadow-2xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SellerFollowersPage() {
  return (
    <Suspense fallback={null}>
      <SellerFollowersContent />
    </Suspense>
  );
}
