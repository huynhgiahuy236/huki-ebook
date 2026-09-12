import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import ForbiddenPage from '../../pages/system/ForbiddenPage';

export function RequireAuth() {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function RequireGuest() {
  const { isLoggedIn, user, isLoading } = useAuth();

  if (isLoading) {
    return null;
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
  const { isLoggedIn, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isSeller = user?.role === 'BUSINESS' || user?.roleKey === 'seller' || user?.hasApprovedBusiness;
  if (!isSeller) {
    return <ForbiddenPage title="Bạn chưa có quyền Người Bán" desc="Khu vực này chỉ dành cho tài khoản NXB / Tác giả đã được HUKI phê duyệt." backLink="/seller/register" backText="Đăng ký người bán ngay" />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { isLoggedIn, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.roleKey === 'admin';
  if (!isAdmin) {
    return <ForbiddenPage title="Yêu cầu quyền Platform Admin" desc="Khu vực này chỉ dành riêng cho Quản trị viên sàn HUKI." backLink="/" backText="Về trang chủ" />;
  }

  return <Outlet />;
}

