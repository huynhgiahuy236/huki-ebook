import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function LoadingSpinner() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status">
      <div className="rounded-xl border border-outline-variant bg-white px-5 py-3 text-sm font-semibold text-on-surface shadow-sm">
        Đang xác thực phiên làm việc…
      </div>
    </div>
  );
}

export function RequireAuth() {
  const { isLoggedIn, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}

export function RequireGuest() {
  const { isLoggedIn, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isLoggedIn) {
    if (user?.role === 'PLATFORM_ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (user?.role === 'BUSINESS') {
      return <Navigate to="/seller/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function RequireSeller() {
  const { isLoggedIn, isLoading, hasRole, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole('BUSINESS') && !hasRole('seller')) {
    return <AccessDenied message="Khu vực này chỉ dành cho tài khoản Admin Doanh Nghiệp hoặc Nhân viên được phân quyền." />;
  }

  return <Outlet />;
}

export function RequirePermission({ permission, businessId }) {
  const { isLoggedIn, isLoading, can } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!can(permission, businessId)) {
    return <AccessDenied message={`Bạn không có quyền (${permission}) để truy cập chức năng này.`} />;
  }

  return <Outlet />;
}

export function AccessDenied({ message }) {
  return (
    <main className="min-h-[70vh] bg-background px-4 py-16 flex items-center justify-center" id="main-content">
      <section className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
        <span className="material-symbols-outlined text-5xl text-error" aria-hidden="true">lock</span>
        <h1 className="mt-4 font-editorial text-3xl font-bold text-on-surface">Truy cập bị từ chối (403)</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          {message || 'Bạn không có quyền truy cập vào khu vực này.'}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/" className="min-h-11 rounded-xl border border-outline-variant px-5 py-2.5 font-semibold text-on-surface hover:bg-surface-container">
            Về trang chủ
          </Link>
          <Link to="/seller/register" className="min-h-11 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white hover:opacity-90">
            Đăng ký người bán
          </Link>
        </div>
      </section>
    </main>
  );
}
