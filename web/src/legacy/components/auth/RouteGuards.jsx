import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function RequireAuth() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function RequireGuest() {
  const { isLoggedIn, user } = useAuth();

  if (isLoggedIn) {
    return <Navigate to={user?.roleKey === 'seller' ? '/seller/dashboard' : '/'} replace />;
  }

  return <Outlet />;
}

export function RequireSeller() {
  const { hasRole, user } = useAuth();

  if (!hasRole('seller')) {
    return <AccessDenied />;
  }

  if (user?.sellerStatus !== 'approved') {
    return <Navigate to="/seller/register" replace />;
  }

  return <Outlet />;
}

function AccessDenied() {
  return (
    <main className="min-h-[70vh] bg-background px-4 py-16 flex items-center justify-center" id="main-content">
      <section className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
        <span className="material-symbols-outlined text-5xl text-error" aria-hidden="true">lock</span>
        <h1 className="mt-4 font-editorial text-3xl font-bold text-on-surface">Bạn không có quyền truy cập</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Khu vực này chỉ dành cho tài khoản người bán đã được HUKI phê duyệt.
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
