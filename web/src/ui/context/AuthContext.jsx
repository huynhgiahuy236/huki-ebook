import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { businessApi } from '../api/businessApi';
import { tokenStorage } from '../api/tokenStorage';
import { can as canPermission } from '../utils/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBusinessId, setActiveBusinessId] = useState(null);
  const [authError, setAuthError] = useState(null);

  const isLoggedIn = Boolean(user);

  const normalizeUserData = (userData) => {
    if (!userData) return null;
    const normalizedName =
      userData.fullName ||
      userData.name ||
      userData.profile?.fullName ||
      (userData.role === 'PLATFORM_ADMIN'
        ? 'Super Admin'
        : userData.role === 'BUSINESS'
        ? 'Chủ Doanh Nghiệp'
        : userData.email?.split('@')[0] || 'Người Dùng');
    return {
      ...userData,
      name: normalizedName,
      fullName: userData.fullName || normalizedName,
    };
  };

  const hydrateBusiness = async (rawUserData) => {
    if (!rawUserData) return null;
    const userData = normalizeUserData(rawUserData);
    if (userData.role === 'PLATFORM_ADMIN') return userData;
    const bizRes = await businessApi.getMyBusiness();
    if (!bizRes.success || !bizRes.data) return userData;
    if (bizRes.data.id) setActiveBusinessId(bizRes.data.id);
    if (bizRes.data.status === 'APPROVED') {
      const currentRefreshToken = tokenStorage.getRefreshToken();
      if (currentRefreshToken) {
        const tokenRes = await authApi.refreshToken(currentRefreshToken);
        if (tokenRes.success && tokenRes.data?.accessToken && tokenRes.data?.refreshToken) {
          tokenStorage.setTokens(tokenRes.data);
        }
      }
    }
    return {
      ...userData,
      business: bizRes.data,
      hasApprovedBusiness: bizRes.data.status === 'APPROVED',
    };
  };

  // Bootstrap session khi ứng dụng tải
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const tokens = tokenStorage.getTokens();
      if (!tokens) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (isMounted) {
          if (res.success && res.data) {
            let userData = res.data.user || res.data;
            userData = await hydrateBusiness(userData);
            setUser(userData);
            if (Array.isArray(userData?.memberships) && userData.memberships.length > 0) {
              setActiveBusinessId(userData.memberships[0].businessId);
            }
          } else {
            tokenStorage.clearTokens();
            setUser(null);
          }
        }
      } catch {
        if (isMounted) {
          tokenStorage.clearTokens();
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Đăng nhập thật qua API Gateway
  const login = async (emailOrPhone, password) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await authApi.login({ emailOrPhone, password });
      if (res.success && res.data) {
        const rawData = res.data;
        const accessToken = rawData.accessToken || rawData.tokens?.accessToken;
        const refreshToken = rawData.refreshToken || rawData.tokens?.refreshToken;
        let userData = rawData.user || rawData;

        if (accessToken && refreshToken) {
          tokenStorage.setTokens({ accessToken, refreshToken });
        }

        userData = await hydrateBusiness(userData);

        setUser(userData);

        if (Array.isArray(userData?.memberships) && userData.memberships.length > 0) {
          setActiveBusinessId(userData.memberships[0].businessId);
        }

        setIsLoading(false);
        return { success: true, user: userData };
      } else {
        const errorMsg = res.error?.message || 'Đăng nhập không thành công.';
        setAuthError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg, code: res.error?.code };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối API.';
      setAuthError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  // Đăng ký thật qua API Gateway
  const register = async (formData) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await authApi.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.name || formData.fullName,
        phone: formData.phone,
      });

      if (res.success && res.data) {
        const rawData = res.data;
        const accessToken = rawData.accessToken || rawData.tokens?.accessToken;
        const refreshToken = rawData.refreshToken || rawData.tokens?.refreshToken;
        const userData = rawData.user || rawData;

        // Chỉ lưu session & setUser khi có token và tài khoản đã ACTIVE (không PENDING)
        if (accessToken && refreshToken && userData?.status === 'ACTIVE') {
          tokenStorage.setTokens({ accessToken, refreshToken });
          setUser(normalizeUserData(userData));
        } else {
          tokenStorage.clearTokens();
          setUser(null);
        }

        setIsLoading(false);
        return { success: true, user: userData };
      } else {
        const errorMsg = res.error?.message || 'Đăng ký không thành công.';
        setAuthError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối API.';
      setAuthError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  // Đăng xuất
  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors and proceed to clear client session
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
      setActiveBusinessId(null);
      setIsLoading(false);
    }
  };

  // Đổi mật khẩu
  const changePassword = async (currentPassword, newPassword) => {
    const res = await authApi.changePassword({ currentPassword, newPassword });
    if (res.success) {
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
    }
    return res;
  };

  // Xác thực Email
  const verifyEmail = async (token) => {
    return authApi.verifyEmail(token);
  };

  // Gửi lại Email xác thực
  const resendVerification = async (email) => {
    return authApi.resendVerification(email);
  };

  const refreshBusiness = async () => {
    if (!user) return null;
    const nextUser = await hydrateBusiness(user);
    setUser(nextUser);
    return nextUser?.business || null;
  };

  // Kiểm tra Global Role (USER, BUSINESS, PLATFORM_ADMIN)
  const hasRole = (allowedRoles) => {
    if (!user) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const isSellerOrBusiness = user.role === 'BUSINESS' || Boolean(user.hasApprovedBusiness);
    const mappedRole = user.role === 'PLATFORM_ADMIN' ? 'admin' : isSellerOrBusiness ? 'seller' : 'reader';
    return roles.includes(user.role) || roles.includes(mappedRole) || (isSellerOrBusiness && (roles.includes('BUSINESS') || roles.includes('seller')));
  };

  // Kiểm tra Granular Permission
  const hasPermission = (permission, targetBusinessId = activeBusinessId) => {
    return canPermission(permission, targetBusinessId, user);
  };

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      isLoading,
      authError,
      activeBusinessId,
      setActiveBusinessId,
      login,
      logout,
      register,
      changePassword,
      verifyEmail,
      resendVerification,
      refreshBusiness,
      hasRole,
      hasPermission,
      can: (permission, bizId) => canPermission(permission, bizId || activeBusinessId, user),
    }),
    [user, isLoggedIn, isLoading, authError, activeBusinessId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
