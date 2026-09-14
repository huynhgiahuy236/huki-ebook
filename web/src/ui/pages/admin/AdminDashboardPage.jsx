import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    pendingBusinesses: 0,
    approvedBusinesses: 0,
    totalBusinesses: 0,
    totalBooks: 0,
    activeBooks: 0,
    suspendedBooks: 0,
    healthStatus: 'ok',
  });

  const [pendingBusinesses, setPendingBusinesses] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, bizRes, healthRes] = await Promise.allSettled([
        adminApi.getAdminStats(),
        adminApi.getBusinesses({ status: 'PENDING_APPROVAL', limit: 10 }),
        adminApi.getServiceHealth(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
        setStats(statsRes.value.data);
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* 1. TOP EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              PLATFORM ADMIN CONSOLE
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Trung tâm điều hành sàn HUKI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 font-editorial">
            Bảng Điều Hành Toàn Sàn
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Giám sát hồ sơ đối tác doanh nghiệp chờ duyệt, kiểm soát catalog sách toàn hệ thống &amp; tình trạng microservices.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
              refresh
            </span>
            <span>{refreshing ? 'Đang cập nhật...' : 'Làm mới số liệu'}</span>
          </button>

          <Link
            to="/admin/businesses"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            <span>Xử lý hồ sơ chờ ({stats.pendingBusinesses})</span>
          </Link>
        </div>
      </div>

      {/* 2. STATS CARDS GRID (4 METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Doanh nghiệp chờ duyệt */}
        <Link
          to="/admin/businesses"
          className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Chờ Phê Duyệt</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.pendingBusinesses > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {loading ? '...' : stats.pendingBusinesses}
              </span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Hồ sơ mới
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Doanh nghiệp / NXB vừa đăng ký tài khoản
            </p>
          </div>
        </Link>

        {/* Metric 2: Doanh nghiệp đang hoạt động */}
        <Link
          to="/admin/businesses"
          className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Đối Tác Phát Hành</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">domain</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {loading ? '...' : stats.approvedBusinesses}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Đã phê duyệt
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tổng {stats.totalBusinesses} doanh nghiệp trên toàn sàn
            </p>
          </div>
        </Link>

        {/* Metric 3: Sách toàn sàn */}
        <Link
          to="/admin/books"
          className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Catalog Sách</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">menu_book</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {loading ? '...' : stats.totalBooks}
              </span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Đầu sách
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.activeBooks} đang bán {stats.suspendedBooks > 0 ? `• ${stats.suspendedBooks} bị khóa` : ''}
            </p>
          </div>
        </Link>

        {/* Metric 4: Sức khỏe Microservices */}
        <Link
          to="/admin/health"
          className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Hạ Tầng Backend</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.healthStatus === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              <span className="material-symbols-outlined text-[22px]">health_and_safety</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {stats.healthStatus === 'ok' ? '100% Online' : 'Degraded'}
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${stats.healthStatus === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Gateway + 6 Microservices đang vận hành
            </p>
          </div>
        </Link>
      </div>

      {/* 3. TWO-COLUMN LAYOUT: APPROVAL QUEUE + MICROSERVICES MONITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 cols): Hàng chờ duyệt doanh nghiệp cần xử lý gấp */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Doanh Nghiệp Chờ Phê Duyệt</h2>
                  <p className="text-xs text-gray-500">Hồ sơ đăng ký tài khoản doanh nghiệp mới nhất cần xem xét</p>
                </div>
              </div>

              <Link
                to="/admin/businesses"
                className="text-xs font-bold text-[#00875A] hover:underline flex items-center gap-1"
              >
                <span>Xem tất cả ({stats.pendingBusinesses})</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Đang tải hồ sơ doanh nghiệp...</div>
            ) : pendingBusinesses.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-3xl text-emerald-500 mb-1">check_circle</span>
                <span className="text-xs font-semibold text-gray-600">Không có hồ sơ doanh nghiệp nào chờ duyệt!</span>
                <span className="text-[11px] text-gray-400 mt-0.5">Tất cả các doanh nghiệp đã được xét duyệt hoàn tất.</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 mt-2">
                {pendingBusinesses.map((biz) => (
                  <div key={biz.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-xs shrink-0">
                        {biz.name ? biz.name.charAt(0).toUpperCase() : 'B'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-gray-900 truncate">{biz.name}</h3>
                        <p className="text-[11px] text-gray-500 truncate">
                          MST: {biz.taxCode || 'Chưa cung cấp'} • {biz.email || 'Chưa có email'}
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/admin/businesses"
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition-colors shrink-0"
                    >
                      Duyệt hồ sơ
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1 col): System Health & Quick Actions */}
        <div className="flex flex-col gap-6">
          
          {/* Microservices Health Widget */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">dns</span>
                <h2 className="text-sm font-bold text-gray-900">Trạng Thái Microservices</h2>
              </div>
              <Link to="/admin/health" className="text-xs font-bold text-[#00875A] hover:underline">
                Chi tiết
              </Link>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              {[
                { name: 'API Gateway', port: ':3000', key: 'gateway' },
                { name: 'Identity Service', port: ':3001', key: 'identity' },
                { name: 'Business Service', port: ':3002', key: 'business' },
                { name: 'Commerce Service', port: ':3003', key: 'commerce' },
                { name: 'Shipping Service', port: ':3004', key: 'shipping' },
                { name: 'Community Service', port: ':3005', key: 'community' },
                { name: 'Promotion Service', port: ':3007', key: 'promotion' },
              ].map((svc) => {
                const check = healthData?.services?.find(s => s.service?.toLowerCase() === svc.key.toLowerCase());
                const isOnline = svc.key === 'gateway' || check?.status === 'ok' || !check || check?.status !== 'unavailable';
                return (
                  <div key={svc.name} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
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
                to="/admin/businesses"
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex flex-col items-center text-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-amber-700">domain</span>
                <span className="text-xs font-semibold text-gray-800">Duyệt Doanh Nghiệp</span>
              </Link>

              <Link
                to="/admin/books"
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex flex-col items-center text-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-emerald-700">menu_book</span>
                <span className="text-xs font-semibold text-gray-800">Quản Trị Sách</span>
              </Link>

              <Link
                to="/admin/categories"
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex flex-col items-center text-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px] text-purple-700">category</span>
                <span className="text-xs font-semibold text-gray-800">Danh Mục &amp; Tác Giả</span>
              </Link>

              <Link
                to="/admin/health"
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
