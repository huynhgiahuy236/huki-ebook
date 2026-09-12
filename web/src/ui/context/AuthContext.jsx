import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { tokenStorage } from '../api/tokenStorage';
import { can as canPermission } from '../utils/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBusinessId, setActiveBusinessId] = useState(null);
  const [authError, setAuthError] = useState(null);

  const isLoggedIn = Boolean(user);

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
            const userData = res.data.user || res.data;
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
        const userData = rawData.user || rawData;

        if (accessToken && refreshToken) {
          tokenStorage.setTokens({ accessToken, refreshToken });
        }

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

        if (accessToken && refreshToken) {
          tokenStorage.setTokens({ accessToken, refreshToken });
        }

        setUser(userData);
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
    return authApi.changePassword({ currentPassword, newPassword });
  };

  // Kiểm tra Global Role (USER, BUSINESS, PLATFORM_ADMIN)
  const hasRole = (allowedRoles) => {
    if (!user) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const mappedRole = user.role === 'PLATFORM_ADMIN' ? 'admin' : user.role === 'BUSINESS' ? 'seller' : 'reader';
    return roles.includes(user.role) || roles.includes(mappedRole);
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
