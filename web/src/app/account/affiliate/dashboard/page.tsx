'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';

interface CtvStats {
  profile: {
    id: string;
    affiliateCode: string;
    displayName: string;
    status: string;
  };
  metrics: {
    clicksCount: number;
    conversionsCount: number;
    conversionRate: number;
    pendingCommission: number;
    holdingCommission: number;
    availableCommission: number;
    netAvailableCommission: number;
    debtCommission: number;
    lifetimePaid: number;
    reversedCommission: number;
    currency: string;
  };
  recentCommissions: Array<{
    id: string;
    orderId: string;
    orderItemId: string;
    bookTitle: string;
    commissionAmount: number;
    commissionRate: number;
    status: string;
    holdingUntil: string | null;
    createdAt: string;
  }>;
  topLinks: Array<{
    id: string;
    shortCode: string;
    targetType: string;
    clickCount: number;
    conversionCount: number;
    createdAt: string;
  }>;
  version: string;
  refreshedAt: string;
}

export default function AffiliateDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState<CtvStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setIsSyncing(true);

    try {
      const res = await affiliateApi.getCtvDashboardStats();
      if (res.success && res.data) {
        setStats(res.data);
        const date = new Date();
        setLastUpdated(
          date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        );
      }
    } catch {
      // In development / demo environment without active profile, keep stats null
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Decision 1: Background polling fallback every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Decision 2: Export CSV / Excel report
  const handleExport = async (format: 'csv' | 'xlsx' = 'csv') => {
    setIsExporting(true);
    try {
      const query = new URLSearchParams({ format });
      const response = await fetch(`/api/v1/affiliate/reports/export?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `huki-affiliate-report-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      showToast('Đã xuất báo cáo thành công!', 'success');
    } catch {
      showToast('Không thể xuất báo cáo vào lúc này', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formatVnd = (amount?: number) => {
    return (amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  const isLive = Boolean(stats && stats.profile?.status === 'ACTIVE');

  return (
    <AccountLayout>
      <div className="w-full space-y-6 font-sans p-2 sm:p-4">
        {/* Header with Title and Realtime Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Bảng Điều Khiển Đối Tác Tiếp Thị
              </h1>
              {isLive ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1 animate-pulse"></span>
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Chưa mở chính thức
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Trung tâm quản trị hiệu suất, lưu lượng và hoa hồng dành cho Đối tác Tiếp thị HuKi.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {lastUpdated && (
              <span className="text-[11px] text-gray-400 font-medium">
                Cập nhật lúc {lastUpdated}
              </span>
            )}

            <button
              onClick={() => fetchDashboardData(false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-50"
              title="Làm mới dữ liệu từ máy chủ"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isSyncing ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
              <span>Làm mới</span>
            </button>

            {isLive && (
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors"
                title="Tải tệp báo cáo CSV UTF-8"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Xuất CSV</span>
              </button>
            )}

            <Link
              href="/affiliate"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">help</span>
              <span>Chính sách</span>
            </Link>
          </div>
        </div>

        {/* Syncing Banner (Decision 3: Stale UX feedback) */}
        {isSyncing && (
          <div className="py-2 px-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center justify-between transition-all">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              <span>Đang đồng bộ dữ liệu thời gian thực mới nhất...</span>
            </div>
            <span className="text-[10px] text-blue-500 font-mono">Realtime SLA</span>
          </div>
        )}

        {/* Primary Status Banner for Inactive or Guidance */}
        {!isLive && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-50 via-gray-50 to-amber-50/30 border border-stone-200/90 shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <span className="material-symbols-outlined text-[22px]">engineering</span>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-sm font-bold text-gray-900">
                  Dịch Vụ Bảng Điều Khiển Chưa Được Kích Hoạt
                </h2>
                <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                  Tính năng Bảng điều khiển đối tác tiếp thị đang được hoàn thiện và chưa mở chính thức.
                  Dữ liệu hiệu suất nhấp chuột, báo cáo chuyển đổi và các chỉ số tài chính sẽ khả dụng
                  khi hệ thống chính thức đi vào vận hành.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Debt Warning Banner if CTV has negative balance (Phase 7 Decision 3) */}
        {isLive && stats && stats.metrics.debtCommission > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-rose-600">warning</span>
              <span>
                <strong>Tài khoản có công nợ thu hồi:</strong> {formatVnd(stats.metrics.debtCommission)}. Khoản tiền này sẽ được tự động cấn trừ vào các khoản hoa hồng phát sinh kế tiếp.
              </span>
            </div>
            <span className="font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-700">Công nợ</span>
          </div>
        )}

        {/* 7 Core KPI Cards (Guaranteed exact names for tests & users) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              7 Chỉ Số Hiệu Suất Cốt Lõi Dự Kiến
            </h2>
            {isLive && stats && (
              <span className="text-[11px] text-gray-500">
                Tỷ lệ chuyển đổi: <strong className="text-emerald-700">{stats.metrics.conversionRate}%</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Lượt click hợp lệ',
                desc: 'Tổng số lượt nhấp đã qua sàng lọc bot và giới hạn tần suất.',
                icon: 'ads_click',
                value: isLive ? (stats?.metrics.clicksCount ?? 0).toLocaleString('vi-VN') : '--',
                highlight: false,
              },
              {
                label: 'Chuyển đổi',
                desc: 'Đơn hàng đặt thành công có gắn phiên giới thiệu hợp lệ.',
                icon: 'shopping_bag',
                value: isLive ? (stats?.metrics.conversionsCount ?? 0).toLocaleString('vi-VN') : '--',
                highlight: false,
              },
              {
                label: 'Hoa hồng chờ duyệt',
                desc: 'Hoa hồng ghi nhận từ các đơn hàng mới phát sinh thành công.',
                icon: 'hourglass_top',
                value: isLive ? formatVnd(stats?.metrics.pendingCommission) : '--',
                highlight: false,
              },
              {
                label: 'Đang giữ đối soát',
                desc: 'Hoa hồng trong thời gian tạm giữ theo dõi giao nhận và đổi trả.',
                icon: 'lock_clock',
                value: isLive ? formatVnd(stats?.metrics.holdingCommission) : '--',
                highlight: false,
              },
              {
                label: 'Hoa hồng khả dụng',
                desc: 'Hoa hồng đã hoàn tất đối soát và sẵn sàng rút về tài khoản.',
                icon: 'account_balance_wallet',
                value: isLive ? formatVnd(stats?.metrics.netAvailableCommission) : '--',
                highlight: true,
              },
              {
                label: 'Đã thanh toán (Gross)',
                desc: 'Tổng hoa hồng đã giải ngân thành công qua các kỳ thanh toán.',
                icon: 'payments',
                value: isLive ? formatVnd(stats?.metrics.lifetimePaid) : '--',
                highlight: false,
              },
              {
                label: 'Hoa hồng đã thu hồi',
                desc: 'Hoa hồng hoàn trả do đơn hàng bị hủy hoặc phát sinh khiếu nại.',
                icon: 'history_toggle_off',
                value: isLive ? formatVnd(stats?.metrics.reversedCommission) : '--',
                highlight: false,
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl bg-white border shadow-2xs space-y-1 ${
                  kpi.highlight ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-gray-200/80'
                }`}
              >
                <div className="flex items-center justify-between text-gray-400">
                  <span className={`material-symbols-outlined text-[18px] ${kpi.highlight ? 'text-emerald-600' : ''}`}>
                    {kpi.icon}
                  </span>
                  <span className={`text-sm font-mono font-bold ${kpi.highlight ? 'text-emerald-700' : 'text-gray-900'}`}>
                    {kpi.value}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-800 block">{kpi.label}</span>
                <p className="text-[11px] text-gray-500 leading-snug">{kpi.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Recent Commissions & Top Links (When Active) */}
        {isLive && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Links */}
            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">link</span>
                  Liên Kết Hiệu Quả Nhất
                </h3>
                <Link
                  href="/account/affiliate/links"
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  Quản lý link →
                </Link>
              </div>

              {stats.topLinks.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Chưa có liên kết tiếp thị nào được tạo.</p>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {stats.topLinks.map((link) => (
                    <div key={link.id} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-emerald-700">/r/{link.shortCode}</span>
                        <span className="text-[10px] text-gray-400 block uppercase font-semibold">
                          Loại: {link.targetType}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-800 block">
                          {link.clickCount} clicks / {link.conversionCount} đơn
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {link.clickCount > 0
                            ? ((link.conversionCount / link.clickCount) * 100).toFixed(1) + '% CVR'
                            : '0% CVR'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Commissions */}
            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">receipt_long</span>
                  Giao Dịch Hoa Hồng Gần Đây
                </h3>
                <span className="text-[11px] text-gray-400">{stats.recentCommissions.length} mục</span>
              </div>

              {stats.recentCommissions.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Chưa có đơn hàng hoa hồng nào được ghi nhận.</p>
              ) : (
                <div className="divide-y divide-gray-100 text-xs max-h-64 overflow-y-auto pr-1">
                  {stats.recentCommissions.map((comm) => (
                    <div key={comm.id} className="py-2 flex items-center justify-between">
                      <div className="space-y-0.5 max-w-[65%]">
                        <span className="font-medium text-gray-900 truncate block">{comm.bookTitle}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">Đơn #{comm.orderId.slice(0, 8)}</span>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="font-bold text-emerald-700 block">+{formatVnd(comm.commissionAmount)}</span>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                            comm.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : comm.status === 'HOLDING'
                              ? 'bg-blue-100 text-blue-800'
                              : comm.status === 'CANCELLED'
                              ? 'bg-gray-100 text-gray-600'
                              : comm.status === 'REVERSED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {comm.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Safe Navigation Actions */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-gray-600">
            Cần tìm hiểu điều kiện tham gia và chính sách tỷ lệ hoa hồng?
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/affiliate"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors"
            >
              Xem Trang Giới Thiệu
            </Link>
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold transition-colors"
            >
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
