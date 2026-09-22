'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { businessApi, type FollowerItem } from '@/ui/api/businessApi';

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

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, SĐT, mã KH..."
              className="w-full pl-10 pr-9 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#006953] focus:bg-white focus:ring-1 focus:ring-[#006953] transition-all"
            />
            {isDebouncing ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <span className="w-4 h-4 border-2 border-gray-200 border-t-[#006953] rounded-full animate-spin"></span>
              </div>
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            ) : null}
          </div>

          <div className="text-xs text-gray-500 self-end sm:self-auto font-medium">
            {isDebouncing ? (
              <span className="text-amber-600 flex items-center gap-1.5 font-medium">
                <span className="w-3.5 h-3.5 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin shrink-0"></span>
                <span>Đang chờ nhập (2s)...</span>
              </span>
            ) : (
              <span>
                Hiển thị <strong>{followers.length}</strong> / <strong>{total}</strong> người theo dõi
              </span>
            )}
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-5 whitespace-nowrap">Mã Khách Hàng</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Tên Khách Hàng</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Số Điện Thoại</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Trạng Thái</th>
                <th className="py-3.5 px-5 whitespace-nowrap text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <span className="inline-block w-7 h-7 border-3 border-[#006953]/20 border-t-[#006953] rounded-full animate-spin mb-2"></span>
                    <p className="text-xs text-gray-500 font-medium">Đang tải danh sách người theo dõi...</p>
                  </td>
                </tr>
              ) : followers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
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
                followers.map((item) => {
                  const fullName = item.fullName || 'Khách Hàng';
                  const isLongName = fullName.length > 10;
                  const displayName = isLongName ? `${fullName.slice(0, 10)}...` : fullName;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/70 transition-colors group"
                    >
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

                      {/* Cột 4: Trạng thái */}
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

                      {/* Cột 5: Thao tác (Nhắn tin - Tạm thời disabled) */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
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
