"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminApi } from '@/ui/api/adminApi';

export function AdminDashboardView() {
  const [stats, setStats] = useState({
    pendingBusinesses: 0,
    approvedBusinesses: 0,
    totalBusinesses: 0,
    totalBooks: 0,
    activeBooks: 0,
    suspendedBooks: 0,
    healthStatus: 'ok',
  });

  const [pendingBusinesses, setPendingBusinesses] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, bizRes, healthRes] = await Promise.allSettled([
        adminApi.getAdminStats(),
        adminApi.getBusinesses({ status: 'PENDING_APPROVAL', limit: 10 }),
        adminApi.getServiceHealth(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
        setStats(statsRes.value.data as any);
      }

      if (bizRes.status === 'fulfilled' && bizRes.value.success && Array.isArray(bizRes.value.data)) {
        setPendingBusinesses(bizRes.value.data);
      } else {
        setPendingBusinesses([]);
      }

      if (healthRes.status === 'fulfilled' && healthRes.value.success && healthRes.value.data) {
        setHealthData(healthRes.value.data);
      }
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu Admin Dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto">
      {/* 1. TOP EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              PLATFORM ADMIN CONSOLE
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Trung tâm điều hành sàn HUKI</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight mt-1 font-editorial">
            Bảng Điều Hành Toàn Sàn
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Giám sát hồ sơ đối tác doanh nghiệp chờ duyệt, kiểm soát catalog sách toàn hệ thống &amp; tình trạng microservices.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[15px] ${refreshing ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
              refresh
            </span>
            <span>{refreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
          </button>

          <Link
            href="/admin/businesses"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[15px]">how_to_reg</span>
            <span>Xử lý hồ sơ ({stats.pendingBusinesses})</span>
          </Link>
        </div>
      </div>

      {/* 2. STATS KPI CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Pending Businesses */}
        <Link
          href="/admin/businesses?status=PENDING_APPROVAL"
          className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-amber-400 transition-all shadow-2xs group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hồ Sơ Chờ Duyệt</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 font-editorial">{stats.pendingBusinesses}</span>
            <span className="text-xs font-semibold text-amber-600">Yêu cầu mới</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <span>Tổng số {stats.totalBusinesses} doanh nghiệp</span>
            <span className="material-symbols-outlined text-[12px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
          </div>
        </Link>

        {/* Card 2: Approved Businesses */}
        <Link
          href="/admin/businesses?status=APPROVED"
          className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-emerald-400 transition-all shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Doanh Nghiệp Đang Hoạt Động</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">domain_verification</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 font-editorial">{stats.approvedBusinesses}</span>
            <span className="text-xs font-semibold text-emerald-600">Đã kích hoạt</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <span>Bao gồm NXB &amp; Công ty phát hành</span>
          </div>
        </Link>

        {/* Card 3: Total Books */}
        <Link
          href="/admin/books"
          className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-400 transition-all shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sách Toàn Sàn</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">auto_stories</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 font-editorial">{stats.totalBooks}</span>
            <span className="text-xs font-semibold text-blue-600">{stats.activeBooks} Đang bán</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <span>Sách giấy, Ebook &amp; Hybrid DRM</span>
          </div>
        </Link>

        {/* Card 4: Microservice Health */}
        <Link
          href="/admin/health"
          className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-emerald-400 transition-all shadow-2xs group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hạ Tầng Dịch Vụ</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">dns</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-editorial">
              {stats.healthStatus === 'ok' ? '100% OK' : 'Degraded'}
            </span>
            <span className="text-xs font-semibold text-emerald-600">Ổn định</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <span>Gateway, Identity, DRM Vault</span>
          </div>
        </Link>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Urgent Pending Businesses Verification Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">assignment_late</span>
                <h2 className="text-sm font-bold text-gray-900 font-editorial">
                  Hồ Sơ Doanh Nghiệp Cần Thẩm Định ({pendingBusinesses.length})
                </h2>
              </div>
              <Link
                href="/admin/businesses"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Xem tất cả</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {pendingBusinesses.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Không còn hồ sơ tồn đọng</h3>
                <p className="text-xs text-gray-500 max-w-xs mt-0.5">
                  Toàn bộ các đơn đăng ký mở gian hàng doanh nghiệp đã được xử lý và phê duyệt.
                </p>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-gray-100 overflow-x-auto">
                {pendingBusinesses.map((biz: any) => (
                  <div key={biz.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700 shrink-0">
                        {biz.name?.charAt(0) || 'B'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{biz.name}</div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>MST: <strong className="font-mono text-gray-600">{biz.taxCode || 'Chưa cập nhật'}</strong></span>
                          <span>•</span>
                          <span>{biz.email || biz.phone || 'Chưa có liên hệ'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Chờ duyệt
                      </span>
                      <Link
                        href={`/admin/businesses?focus=${biz.id}`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] transition-colors"
                      >
                        Thẩm định
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Tiêu chuẩn SLA: Phê duyệt trong vòng 24h</span>
            <Link href="/admin/businesses" className="text-emerald-700 font-semibold hover:underline">
              Bộ lọc nâng cao
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Platform Health Status & Quick Operations */}
        <div className="flex flex-col gap-4">
          {/* Microservices Live Status */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">monitor_heart</span>
                <span>Trạng Thái Hạ Tầng</span>
              </h2>
              <Link href="/admin/health" className="text-xs font-semibold text-emerald-700 hover:underline">
                Chi tiết
              </Link>
            </div>

            <div className="mt-3 space-y-2">
              {[
                { name: 'API Gateway (BFF)', port: ':8080', key: 'gateway' },
                { name: 'Identity & Auth Service', port: ':3001', key: 'identity' },
                { name: 'Catalog & DRM Service', port: ':3002', key: 'catalog' },
                { name: 'Order & Billing Engine', port: ':3003', key: 'order' },
              ].map((svc, i) => {
                const isOnline = healthData ? (healthData[svc.key]?.status === 'ok' || healthData.status === 'ok') : true;
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-xs font-semibold text-gray-800">{svc.name}</span>
                      <span className="text-[10px] text-gray-400">{svc.port}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {isOnline ? 'ONLINE' : 'DOWN'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Platform Shortcuts */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100">
              Phím Tắt Quản Trị
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/admin/businesses"
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex flex-col items-center text-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-amber-700">domain</span>
                <span className="text-xs font-semibold text-gray-800">Duyệt Doanh Nghiệp</span>
              </Link>

              <Link
                href="/admin/books"
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex flex-col items-center text-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-emerald-700">menu_book</span>
                <span className="text-xs font-semibold text-gray-800">Quản Trị Sách</span>
              </Link>

              <Link
                href="/admin/categories"
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex flex-col items-center text-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-purple-700">category</span>
                <span className="text-xs font-semibold text-gray-800">Danh Mục &amp; Tác Giả</span>
              </Link>

              <Link
                href="/admin/health"
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex flex-col items-center text-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-blue-700">dns</span>
                <span className="text-xs font-semibold text-gray-800">Sức Khỏe Hệ Thống</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardView;
